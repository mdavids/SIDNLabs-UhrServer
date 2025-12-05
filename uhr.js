/* 
 * V 1.6sidnlabs01
 * SIDNLabs version
 * Based on the one and only original by PTB: https://uhr.ptb.de
 */
(function() {

    /* used elements id (see also uhr.html):
     ptbHourHand    rotate hour hand
     ptbMinuteHand    rotate minute hand
     ptbSecondHand    rotate second hand
     ptbTime    show german time as 'hh:ii:ss'
     ptbLocalTimezone show 'UTC+0x:00 (ME[S]Z)' for Germany
     ptbDeviation   deviation text area
     ptbSpeechIconOn   loudspeaker symbol ON
     ptbSpeechIconOff    loudspeaker symbol OFF
     ptbSpeech   loudspeaker basic
     ptbSpeechTab    element for tab-key is pressend to speech on/off
     ptbLinkDeviation click to show deviation area
     ptbOffset    offset compared to system time of operating system
     ptbAccuracy    accuracy of offset
     ptbViewAccuracy  estimated display delay // MD not used ?
     ptbNotice   shown on undefinded problems or not connected
     ptbFaceBackground  change background color if not connected (values in attribute data-fill-connected and data-fill-disconnected)
     ptbLeapInfo    leap info text area (Schaltsekunde)
     ptbLeapText    leap text (values in attribute data-leap1-text and data-leap1-text)
     ptbLeapSecond    the leap second as 'dd.mm.yyy hh:ii:ss'
    */

    var speSynt = window.speechSynthesis; // cause Chrome :-(

    var ptbViewModel = {
        // watch hands
        hourHand: $('#ptbHourHand'),
        minuteHand: $('#ptbMinuteHand'),
        secondHand: $('#ptbSecondHand'),
        setHand: function(h, a) {
            ptbViewModel[h + 'Hand'].attr('transform', 'rotate(' + a + ',100,100)');
        },
        // digital clock
        ptbTime: $('#ptbTime'),
        setPtbTime: function(h, i, s) {
            ptbViewModel.ptbTime.text(('0' + h).substr(-2) + ':' + ('0' + i).substr(-2) + ':' + ('0' + s).substr(-2));
        },
        ptbDate: $('#ptbDate'),
        setPtbDate: function(d, m, y) {
            ptbViewModel.ptbDate.text(('0' + d).substr(-2) + '.' + ('0' + m).substr(-2) + '.' + y);
        },
        localTimezone: $('#ptbLocalTimezone'),
        setLocalTimezone: function(t) {
            ptbViewModel.localTimezone.text(t);
        },
        // Deviation on/off
        deviation: $('#ptbDeviation'),
        linkDeviation: $('#ptbLinkDeviation'),
        speech: $('#ptbSpeechIcon') || {},
        speechIconOn: $('#ptbSpeechIconOn'),
        speechIconOff: $('#ptbSpeechIconOff'),
        speechCheck: function() {
            var ok = ('AudioContext' in window || 'webkitAudioContext' in window) && 'SpeechSynthesisUtterance' in window && 'speechSynthesis' in window;
            if (ok) {
                var vses = speSynt.getVoices();
                if (vses.some(function(v, i) {
                        if (v.lang === 'nl-NL' || v.lang === 'nl') {
                            // MD Speech was Sprache and nl-NL was de-DE (also elsewhere)
                            console.log('Speech ' + v.lang + ' ok;');
                            return true;
                        }
                    })) {
                    return true;
                } else {
                    // MD was: No German speech! 
                    console.log('No Dutch speech!');
                }
            }
        },
        setSpeech: function(e) { // e empty -> inititialize; e keyup or click event -> toggle; e "off" stop speech
            if (ptbViewModel.speechCheck() === true) {
                ptbViewModel.speech.show();
                // MD was remarked
                //console.log(ptbViewModel.speech.status, ptbViewModel.speech.oCounter, e);
                if (!e) {
                    if (ptbViewModel.speech.status !== 'on') {
                        ptbViewModel.speechIconOn.hide();
                        ptbViewModel.speechIconOff.show();
                    }
                } else if (ptbViewModel.speech.status === 'on' || (ptbViewModel.speech.status !== 'off' && e === 'off')) {
                    ptbViewModel.speech.status = 'off';
                    ptbViewModel.speechIconOn.hide();
                    ptbViewModel.speechIconOff.show();
                    ptbViewModel.speech.oCounter += 1;
                    speakit('Spraak gedeactiveerd', function(e) {
                        console.log(ptbViewModel.speech.oCounter, 'Speech deactivated.');
                        ptbViewModel.speech.oCounter -= 1;
                    });
                } else if (ptbViewModel.speech.oCounter === 0 && e !== 'off' && (ptbViewModel.speech.status === 'off' || !ptbViewModel.speech.status)) {
                    ptbViewModel.speech.status = 'on';
                    ptbViewModel.speechIconOff.hide();
                    ptbViewModel.speechIconOn.show();
                    if (!ptbViewModel.speech.audioCtx) {
                        ptbViewModel.speech.audioCtx = new(window.AudioContext || window.webkitAudioContext)();
                    }
                    piep(true); // placebo peep, that iPhone register audio event based
                    ptbViewModel.speech.oCounter += 1;
                    speakit('Klok van SIDN Labs. Spraak geactiveerd', function(e) {
                        console.log(ptbViewModel.speech.oCounter, 'Speech activated.');
                        ptbViewModel.speech.oCounter -= 1;
                    });
                }
            } else {
                ptbViewModel.speech.hide();
            }
        },
        speechTab: $('#ptbSpeechTab'),
        accuracy: $('#ptbAccuracy'),
        setAccuracy: function(v) {
            ptbViewModel.accuracy.msec = v;
            ptbViewModel.accuracy.text('\xB1 ' + v + ' ms');
        }, // MD: \xB1 is ±
        offset: $('#ptbOffset'),
        setOffset: function(o) {
            ptbViewModel.offset.text(o);
        },
        connected: function(s) {
            if (s === true) {
                ptbViewModel.connected.status = true;
                $('#ptbNotice').hide();
                ptbViewModel.setSpeech();
                $('#ptbFaceBackground').attr('fill', function() {
                    return $(this).attr('data-fill-connected');
                }); //data-fill-connected="rgb(200,200,200)"
                if (ptbViewModel.deviation.ptbShowStatus === true) {
                    $('#ptbLinkDeviation').hide();
                    $('#ptbDeviation').show();
                } else {
                    $('#ptbLinkDeviation').show();
                    $('#ptbDeviation').hide();
                }
            } else if (s === false) {
                $('#ptbFaceBackground').attr('fill', function() {
                    return $(this).attr('data-fill-disconnected');
                }); //data-fill-disconnected="rgb(255,178,178)"
                ptbViewModel.connected.status = false;
                $('#ptbNotice').text(function() {
                    return $(this).attr('data-not-connected');
                });
                $('#ptbNotice').show();
                $('#ptbLinkDeviation').hide();
                $('#ptbDeviation').hide();
            } else {
                return ptbViewModel.connected.status;
            }
        },
        leap: function(l) {
            if (typeof l === 'undefined') {
                return ptbViewModel.leap.status;
            } else if (l === 1 || l === 2) {
                ptbViewModel.leap.status = l;
                $('#ptbLeapText').text(function() {
                    return $(this).attr('data-leap' + l + '-text');
                });
            } else {
                ptbViewModel.leap.status = 0;
                ptbViewModel.leap.statustext = false;
                $('#ptbLeapInfo').hide();
                $('#ptbLeapSecond').text('--.--.---- --:--:--');
                $('#ptbLeapText').text('');
                if (l === 3) { // leap=3 Server clock not synhcronized
                    // MD 
                    console.log("Leap=3 indication server clock is not synchronised")
                    ptbViewModel.connected(false);
                }
            }
        }
    }

    ptbViewModel.deviation.click(function() {
        ptbViewModel.deviation.ptbShowStatus = false;
        ptbViewModel.deviation.hide();
        ptbViewModel.linkDeviation.show();
    });
    ptbViewModel.linkDeviation.click(function() {
        ptbViewModel.deviation.ptbShowStatus = true;
        ptbViewModel.deviation.show();
        ptbViewModel.linkDeviation.hide();
    });
    ptbViewModel.speech.click(function(e) {
        ptbViewModel.setSpeech(e);
    });
    ptbViewModel.speech.oCounter = 0;
    ptbViewModel.speechTab.keyup(function(e) {
        // MD was remarked
        //console.log(e);
        if (e.keyCode === 27) { //ESC
            ptbViewModel.setSpeech('off');
        } else if (e.keyCode === 9 || e.keyCode === 32) {
            ptbViewModel.setSpeech(e);
        }
    });

    // more global vars
    var redo = 60000, // duration in ms when clock is resetted with PTB time
        n = 5, // Sample to calculate the delay
        ad = Array(), // series of time requests results (ping-pong)
        timeDelta, // Difference between local time tick an server time
        leapDelta = 0; // Leap ms correction

    // MD was remarked 
    //console.log(wsock);

    // Add official German time format function to Date-Object. Caution! Methods work only on this site regard to leap second!
    Date.prototype.PTBTime = function() {
        // letzten Sonntag im März um 2 Uhr mitteleuropäischer Zeit auf 3 Uhr vorstellen. D.h. ab 1 Uhr UTC im letzten Sonntag im März UTC+2 verwenden.
        // letzten Sonntag im Oktober um 3 Uhr mitteleuropäischer Sommerzeit auf 2 Uhr zurück stellen. D.h. ab 1 Uhr UTC im letzten Sonntag im Oktober UTC+1 verwenden.
        var mth = this.getUTCMonth(),
            dt = this.getUTCDate(),
            dy = this.getUTCDay(),
            hr = this.getUTCHours();
        // PTB: German time: Don't use any libary. Calculate CEST by the script:
        this.utc2ptb = 1; //CET
        if ((mth > 2 && mth < 9) || // April-September
            (mth === 2 && // march
                (dt > 24) &&
                ((dy == 0 && hr >= 1) || // on sunday in the last 7 days at more then 1 o'clock utc
                    (dy > 0 && (dt - dy) > 24))) || // Days after the last sunday in march
            (mth === 9 && // october
                !((dt > 24) && // not after the last Sunday at 1 o'clock in october
                    ((dy == 0 && hr >= 1) || // on sunday in the last 7 days at more then 1 o'clock utc
                        (dy > 0 && (dt - dy) > 24)))) // Days after the last sunday in october
        ) {
            this.utc2ptb = 2;
        } // CEST!
        // Calculate leap second correction and show leap info in display!
        var notYet = 0;
        if (ptbViewModel.leap.status === 1 || ptbViewModel.leap.status === 2) {
            var mdys = [0, 0, 31, 0, 0, 30, 0, 0, 30, 0, 0, 31], // possible days/months for leap second
                leapTmp = 0;
            if (ptbViewModel.leap.status === 1) leapTmp = -1000; // last second of month ticks two times
            if (ptbViewModel.leap.status === 2) leapTmp = 1000; // last second of month don't tick
            if (leapTmp !== 0 && mdys[mth]) {
                if (dt === mdys[mth] && hr === 23 && this.getUTCMinutes() === 59 && this.getUTCSeconds() === 59) {
                    leapDelta = leapTmp;
                    notYet = (ptbViewModel.leap.status === 1);
                    ptbViewModel.leap(0);
                } else if (!ptbViewModel.leap.statustext) { // leap second text not set yet
                    $('#ptbLeapInfo').show();
                    var lsTmp = new Date(Date.UTC(this.getUTCFullYear(), mth, mdys[mth], 23 + this.utc2ptb, 59, 59));
                    $('#ptbLeapSecond').text(
                        ('0' + lsTmp.getUTCDate()).substr(-2) + '.' +
                        ('0' + (lsTmp.getUTCMonth() + 1)).substr(-2) + '.' +
                        lsTmp.getUTCFullYear() + ' ' +
                        ('0' + lsTmp.getUTCHours()).substr(-2) + ':' +
                        ('0' + lsTmp.getUTCMinutes()).substr(-2) + ':' +
                        ('0' + lsTmp.getUTCSeconds()).substr(-2));
                    ptbViewModel.leap.statustext = true;
                }
            }
        }
        // make leap second and timezone correction:
        this.ptbtime = new Date(this.valueOf() + (notYet ? 0 : leapDelta) + (this.utc2ptb * 60 * 60 * 1000)); // if leap = 1 set leapDelta beginning with next tick.
        return this.ptbtime;
    }
    Date.prototype.getPTBHours = function() {
        return this.ptbtime.getUTCHours();
    };
    Date.prototype.getPTBMinutes = function() {
        return this.ptbtime.getUTCMinutes();
    }
    Date.prototype.getPTBSeconds = function() {
        return this.ptbtime.getUTCSeconds();
    }
    Date.prototype.getPTBDate = function() {
        return this.ptbtime.getUTCDate();
    }
    Date.prototype.getPTBMonth = function() {
        return this.ptbtime.getUTCMonth();
    }
    Date.prototype.getPTBYear = function() {
        return this.ptbtime.getUTCFullYear();
    }
    Date.prototype.getPTBTimezone = function() {
        return (this.utc2ptb == 1 ? 'CET' : 'CEST') + ' (UTC+0' + this.utc2ptb + ':00)';
    }

    // e.g. Safari doesn't support window.performance, so build anything related, good enough as workaround
    if (typeof window.performance === 'undefined') {
        window.performance = {};
    }
    if (typeof window.performance.now !== 'function') {
        window.performance.now = function now() {
            if ('function' === typeof Date.now) {
                return Date.now();
            } else {
                return new Date().valueOf();
            }
        }
    }

    // Nice offset format
    function timeDiff(p) {
        var locTm = new Date();
        d = locTm.getTime() - (locTm.getTimezoneOffset() * 60 * 1000) - p;
        var n = (d < 0);
        if (n) d *= -1;
        var mi = {
                d: [24 * 60 * 60 * 1000],
                h: [60 * 60 * 1000],
                min: [60 * 1000],
                s: [1000],
                ms: [1]
            },
            b = [];
        for (var x in mi) {
            mi[x][1] = Math.floor(d / mi[x][0]);
            d = d % mi[x][0];
        }
        for (var x in mi) {
            if (mi[x][1] != 0) b.push(mi[x][1] + ' ' + x);
        }
        b.push((b.length == 0 ? 'precies goed' : (n ? 'achter' : 'voor')));
        ptbViewModel.setOffset(b.join(' '));
    }

    // Reset Clock
    function resetClock(err) {
        ptbViewModel.connected(false);
        ptbViewModel.setHand('hour', 0);
        ptbViewModel.setHand('minute', 0);
        ptbViewModel.setHand('second', 0);
        ptbViewModel.setPtbTime('--', '--', '--');
        ptbViewModel.setLocalTimezone('--');
        ptbViewModel.setPtbDate('--', '--', '----');
    }

    var wsock,
        ppTimeout,
        cbTimeout,
        rcTimeout,
        ppActiv = false; // force only one activ pingpong

    // WebSocket control
    function connectWebSocket() {
        var host = $('#ptbUhrScript').attr('src').replace(/^https:\/\//, '').replace(/\/.*/, '');
        if (!host) {
            host = document.location.origin.replace(/^https:\/\//, '').replace(/\/.*/, '');
        }
        // MD: +host+ does not seem to work for us
        //wsock=new WebSocket('ws://'+host+'/time','time'),   // Unterverzeichnis /time verwenden, als Unterscheidung zur Start-Webseite
        //wsock=new WebSocket('wss://uhr.ptb.de/time','time'),   // Unterverzeichnis /time verwenden, als Unterscheidung zur Start-Webseite
        wsock = new WebSocket("wss:\/\/klok.sidnlabs.nl:8123\/time"), // Unterverzeichnis /time verwenden, als Unterscheidung zur Start-Webseite
            // Calculate median of delay to server and time offset to server
            wsock.onmessage = function(evnt) {
                var sdata = JSON.parse(evnt.data);
                // MD was remarked
                //console.log(sdata);
                // Calculate difference in ms between returned server time an performance.now();
                var dtB = performance.now() - sdata.c, // roundtrip to server
                    tmDlt = performance.now() - sdata.s - (dtB / 2); // how many milliseconds is performance.now() away from UTC; estimate, that both directions are equal fast
                ad.push([tmDlt, dtB, sdata.e]);
                if (ad.length > n) {
                    ad.shift();
                }
                ad.sort(function(a, b) {
                    return a[1] - b[1]
                }); // sort by dtB
                timeDelta = ad[0][0]; // use tmDlt of fastest dtB as time correction value
                leapDelta = 0; // reset calculated leap second correction because server gives correct time
                // MD: was remarked
                //console.log('dtB:', ad[0][1], 'tmDlt:', ad[0][0], 'rootdelay:', ad[0][2], 'ad.len:', ad.length);
                ptbViewModel.setAccuracy(Math.round(ad[0][1] / 2 + ad[0][2])); // use dtB/2+uncertainty of server as real uncertainty-value
                // Start clock if not running
                if (typeof cbTimeout === 'undefined') {
                    cbTimeout = setTimeout(clockBeat, 1000 - (new Date(performance.now() - timeDelta)).getMilliseconds());
                }
                //MD was: console.log('#', ad.length, dtB/2, ad[0][1]/2, ad[0][2], sdata.l);
                //console.log('ad.length', ad.length, 'dtB/2', dtB / 2, 'ad[0][1]/2', ad[0][1] / 2, 'ad[0][2]', ad[0][2], 'sdata.l', sdata.l);
                if (ad.length < n) {
                    wsock.send(JSON.stringify({
                        c: performance.now()
                    }));
                } else {
                    ppActiv = false;
                    ptbViewModel.leap(sdata.l || 0);
                    // Redo PingPong after "redo" ms.
                    ppTimeout = setTimeout(function() {
                        if (wsock.readyState === wsock.OPEN) {
                            ad = Array();
                            ppActiv = true;
                            console.log('Time request start. reason: redo after', redo / 1000, 's');
                            wsock.send(JSON.stringify({
                                c: performance.now()
                            }));
                        }
                    }, redo);
                }
            }
        wsock.onopen = function() {
            if (!ppActiv) {
                clearTimeout(ppTimeout);
                clearTimeout(cbTimeout);
                cbTimeout = undefined;
                clearTimeout(rcTimeout);
                checkWS.init();
                ad = Array();
                ppActiv = true;
                console.log('Time request start. reason: onopen websocket');
                wsock.send(JSON.stringify({
                    c: performance.now()
                }));
                ptbViewModel.connected(true);
            }
        }
        wsock.onclose = function() {
            clearTimeout(ppTimeout);
            ptbViewModel.connected(false);
            rcTimeout = setTimeout(checkWS, checkWS.wait);
        }
        wsock.onerror == function() {
            ppActiv = false;
            clearTimeout(cbTimeout);
            cbTimeout = undefined;
            resetClock();
            rcTimeout = setTimeout(checkWS, checkWS.wait);
        }
    }

    // check WebSocket. If not connected, connect and check several seconds again
    function checkWS(e) {
        if (!wsock || wsock.readyState === 3) {
            console.log('try reconnect', checkWS.wait);
            connectWebSocket();
            if (!e && checkWS.wait < 120000) {
                checkWS.wait *= 1.3;
            }
        }
    }
    checkWS.init = function() {
        checkWS.wait = Math.random() * 1000 + 1000;
    }; // initial wait between 1 and 2 secondes
    checkWS.init();

    // Start WebSocket
    checkWS();

    // check on focus
    window.onfocus = function(e) {
        console.log('focus');
        checkWS(e);
    }

    // clock ticker
    function clockBeat() {
        if (typeof clockBeat.prevClock == 'undefined') clockBeat.prevClock = new Date();
        // What UTC time is it?
        var clock = new Date(performance.now() - timeDelta);
        // direkt nach Zeiterstellung nächsten Aufruf definieren.
        cbTimeout = setTimeout(clockBeat, 1000 - clock.getMilliseconds());
        if ((clock.valueOf() - clockBeat.prevClock.valueOf()) > 3200) { // clock runs more then 2200ms not steadily (standby, sleep-mode etc.)-> run correction
            if (!ptbViewModel.connected()) {
                resetClock(); // Stop watch
                return;
            } else {
                clearTimeout(ppTimeout);
                ad = Array();
                console.log('Time request start. reason: websocket connected but clock runs not steadily.');
                wsock.send(JSON.stringify({
                    c: performance.now()
                }));
            }
        } else {
            timeDiff(clock.PTBTime());
            var hours = clock.getPTBHours(),
                minutes = clock.getPTBMinutes(),
                seconds = clock.getPTBSeconds();
            ptbViewModel.setHand('hour', hours * 30 + minutes * 0.5);
            ptbViewModel.setHand('minute', minutes * 6);
            ptbViewModel.setHand('second', seconds * 6);
            ptbViewModel.setPtbTime(hours, minutes, seconds);
            ptbViewModel.setLocalTimezone(clock.getPTBTimezone());
            ptbViewModel.setPtbDate(clock.getPTBDate(), clock.getPTBMonth() + 1, clock.getPTBYear());
            // speeche text
            if (ptbViewModel.speech.status === 'on') {
                // beep
                if ((seconds % 10) == 0) {
                    piep();
                }
                var sx = seconds + 7
                mx = minutes,
                    hx = hours;
                if ((sx % 10) == 0) {
                    if (sx >= 60) {
                        sx = 0;
                        mx++;
                    }
                    if (mx >= 60) {
                        mx = 0;
                        hx++;
                    }
                    if (hx == 24) {
                        hx = 0;
                    }
                    // Geen punt achter de zin, want Firefox spreekt dat dan (soms?) letterlijk als "punt" uit.
                    setTimeout(speakit, 500, 'Bij de volgende toon is het' + (sx == 0 ? ' precies ' : ': ') + hx + 'uur' + (mx > 0 ? ' "' + mx + '"' : '') + (sx > 0 ? ', en ' + sx + ' seconden ' : ''));
                }
            }
        }
        // MD was remarked en was Tickdauer
        //console.log('Tickduration:',performance.now()-xbegin, 'ms');
        clockBeat.prevClock.setTime(clock.valueOf());
    }

    function piep(placebo) {
        var osci = ptbViewModel.speech.audioCtx.createOscillator();
        osci.connect(ptbViewModel.speech.audioCtx.destination);
        osci.type = 'sine';
        osci.frequency.value = 2093.004522; //c''''
        osci.start();
        osci.stop(ptbViewModel.speech.audioCtx.currentTime + (placebo ? 0 : 0.05));
    }

    function speakit(t, caba) {
        var u = new SpeechSynthesisUtterance();
        u.lang = 'nl-NL';
        u.rate = 1.0;
        u.text = t;
        if (typeof caba === 'function') u.onend = caba;
        speSynt.speak(u);
    }

})()
