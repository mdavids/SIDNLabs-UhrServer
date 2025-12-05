// UhrServer
//
// Made by SIDN Labs (Marco Davids)
// An uhr.ptb.de reversed engineerd back-end
//
// Implements a secure, real-time WebSocket time service.
// It performs an NTP query on every client request to ensure the time
// and leap second status are synchronized with the NTP source at that moment.
//
package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"time"

	"github.com/beevik/ntp"
	"github.com/gorilla/websocket"
)

// --- CONFIGURATION CONSTANTS ---

const (
	// DefaultNTPHost is the NTP server used for the time query on every client request.
	DefaultNTPHost = "ntp.time.nl"
)

// --- NTP LEAP STATUS CONSTANTS ---
// These constants define the leap second indicators.

const (
	// LeapNoWarning indicates no impending leap second.
	LeapNoWarning = 0 // 0b00
	// LeapAddSecond indicates the last minute of the day has 61 seconds.
	LeapAddSecond = 1 // 0b01
	// LeapDelSecond indicates the last minute of the day has 59 seconds.
	LeapDelSecond = 2 // 0b10
		// LeapNotInSync indicates an unsynchronized leap second (e.g., source not sync'd).
	LeapNotInSync = 3 // 0b11
)

// --- COMMAND LINE FLAGS AND UPGRADER ---

// addr is a command-line flag to set the listening address and port.
var addr = flag.String("addr", ":8123", "HTTP service address (e.g., :8123)")

// upgrader is configured for upgrading HTTP connections to WebSocket connections.
var upgrader = websocket.Upgrader{
	// Allowing cross-origin for testing/development. Should be hardened for production.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// --- DATA STRUCTURES ---

// ClientMessage defines the expected JSON structure from the client.
type ClientMessage struct {
	// 'c' is typically a sequence or counter value sent by the client.
	C float64 `json:"c"`
}

// ServerResponse defines the JSON structure sent back to the client.
type ServerResponse struct {
	// 'c' is the echoed client counter.
	C float64 `json:"c"`
	// 's' is the server time in Unix milliseconds (float for high precision).
	S float64 `json:"s"`
	// 'e' is a field for potential time error/latency (kept for compatibility with original design).
	E float64 `json:"e"`
	// 'l' is the leap second indicator (0, 1, 2, or 3).
	L uint8   `json:"l"`
}

// --- CORE LOGIC FUNCTIONS ---

// queryTimeStatus queries the given NTP host for the synchronized time and leap status.
// It is called for every client request to ensure the time is as recent as possible.
func queryTimeStatus(host string) (time.Time, uint8) {
	// A placeholder time (local clock) and the safest default status.
	// Used if the NTP query fails.
	t := time.Now()
	status := uint8(LeapNoWarning) 

	// 5-second timeout for the NTP query
	r, err := ntp.QueryWithOptions(host, ntp.QueryOptions{Timeout: 5 * time.Second})
	if err != nil {
		log.Printf("ERROR: Failed to retrieve time/status from %s: %v. Using local clock and LeapNoWarning.", host, err)
		// On error, return the local time (best effort) and default status.
		return t, status 
	}

	// Successfully retrieved time and status
	t = r.Time // The time reported by the server, corrected by the local offset.
	
	// Explicit type conversion (uint8) is necessary here to fix the compile error,
	// as r.Leap is of type ntp.LeapIndicator.
	status = uint8(r.Leap) 

	// Log announcements, but only for Add/DelSecond, otherwise it floods the log.
	switch status {
	case LeapAddSecond, LeapDelSecond:
		log.Printf("INFO: Leap second announcement detected: %d", status)
	case LeapNotInSync:
		log.Printf("WARN: NTP server %s reports LeapNotInSync. Indicator: %d", host, status)
	case LeapNoWarning:
		// Normal operation, no logging needed
	default:
		log.Printf("WARN: Unexpected Leap status value %d received. Using LeapNoWarning.", status)
		status = uint8(LeapNoWarning)
	}

	return t, status
}

// serveWs handles the WebSocket connection for the /time endpoint.
func serveWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("ERROR: WebSocket upgrade failed:", err)
		return
	}
	defer conn.Close()

	log.Printf(
		"INFO: New WebSocket client connected: %s | RemoteAddr: %s",
		r.RequestURI,
		r.RemoteAddr,
	)

	// Keep the connection open and process incoming messages.
	for {
		mt, message, err := conn.ReadMessage()
		if err != nil {
			// Handle graceful and non-graceful disconnects
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				// log.Printf("INFO: Client %s disconnected gracefully.", r.RemoteAddr)
			} else {
				log.Println("ERROR: WebSocket read error:", err)
			}
			break
		}

		// 1. Process client message
		var clientMsg ClientMessage
		if err := json.Unmarshal(message, &clientMsg); err != nil {
			log.Printf("WARN: Received garbage or non-JSON message from %s: %s", r.RemoteAddr, message)
			// Skip this message, but keep the connection alive
			continue
		}
		
		// 2. IMPORTANT: Perform NTP query immediately upon receiving the client request.
		syncedTime, leap := queryTimeStatus(DefaultNTPHost)

		// Calculate the number of milliseconds since the Unix Epoch from the synchronized time.
		millis := float64(syncedTime.UnixNano()) / float64(time.Millisecond)

		// 3. Construct and serialize response
		response := ServerResponse{
			C: clientMsg.C,
			S: millis,
			E: 0.000,
			L: leap,
		}

		responseBytes, err := json.Marshal(response)
		if err != nil {
			log.Println("FATAL: Failed to marshal server response:", err)
			break
		}

		// 4. Send response back to the client
		err = conn.WriteMessage(mt, responseBytes)
		if err != nil {
			log.Println("ERROR: WebSocket write error:", err)
			break
		}
	}
}

// --- MAIN FUNCTION ---

func main() {
	flag.Parse()
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile) 
    
    // NOTE: The monitorTimeStatus goroutine is REMOVED, as per user request.

	// Set up HTTP handlers
	http.HandleFunc("/time", serveWs)
	// Serve static files from the current directory (e.g., an index.html for testing).
	http.Handle("/", http.FileServer(http.Dir("./")))

	log.Printf("Server starting on %s. Use wss://%s/time for connection.", *addr, *addr)

	// The server requires valid TLS certificates to run securely (recommended for WebSockets: wss://).
	// NOTE: Update these paths to your actual certificate locations!
	err := http.ListenAndServeTLS(*addr,
		"/home/uhr/fullchain.pem",
		"/home/uhr/privkey.pem",
		nil)

	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
