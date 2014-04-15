// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014
(function () {

    var cur_video_blob = null;
    var fb_instance;
    var mediaRecorder;
    var timer;
    var users = [];

    $(document).ready(function () {
        connect_to_chat_firebase();
        connect_webcam();
    });

    function connect_to_chat_firebase() {
        /* Include your Firebase link here!*/
        fb_instance = new Firebase("https://radiant-fire-5488.firebaseio.com/");

        // generate new chatroom id or use existing id
        var url_segments = document.location.href.split("/#");
        if (url_segments[1]) {
            fb_chat_room_id = url_segments[1];
        } else {
            fb_chat_room_id = Math.random().toString(36).substring(7);
        }
        display_msg({
            m: "Share this url with your friend to join this chat: " + document.location.origin + "/#" + fb_chat_room_id,
            c: "red"
        })

        // set up variables to access firebase data structure
        var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
        var fb_instance_users = fb_new_chat_room.child('users');
        var fb_instance_stream = fb_new_chat_room.child('stream');
        var my_color = "#" + ((1 << 24) * Math.random() | 0).toString(16);

        // listen to events //bounded events.. on child_added, paste a message
        fb_instance_users.on("child_added", function (snapshot) {
            display_msg({
                m: snapshot.val().name + " joined the room",
                c: snapshot.val().c
            });
            users.push(snapshot.val().name);
        });
        fb_instance_stream.on("child_added", function (snapshot) {
            display_msg(snapshot.val());
        });

        // block until username is answered
        var username = window.prompt("Welcome! please declare your name?");
        if (!username) {
            username = "anonymous" + Math.floor(Math.random() * 1111);
        }
        fb_instance_users.push({
            name: username,
            c: my_color
        });
        $("#waiting").remove();

        // bind submission box
        var this_blob = null;
        var this_timeout = null;

        var msg_data = [];
        $("#submission input").keydown(function (event) {

            //if the button pressed is not a space 
            var msgInput = $(this).val();
            var wordArr = msgInput.split(" ");
            var lastWord = wordArr[wordArr.length - 1];

            if (msgInput.charAt(msgInput.length - 1) === ':' && (has_emotions(lastWord) || lastWord.indexOf('[REC]') != -1)) {
                
                  if (event.which == 13 || event.which == 32) {
                    clearInterval(timer);
                    mediaRecorder.stop();
                    mediaRecorder.start(3000);
                    var obj = this;
                    setTimeout(function () {
                        msg_data.pop();
                        this_blob = cur_video_blob;
                        msg_data.push(this_blob);
                        timer = setInterval(function () {
                            mediaRecorder.stop();
                            mediaRecorder.start(3000);
                        }, 3000);
                        if (event.which == 13) {

                            var currentText = "";
                            for (var i = 0; i <= wordArr.length - 1; i++) {
                                if (has_emotions(wordArr[i]) || wordArr[i].indexOf('[REC]:') != -1) {
                                  var vid = msg_data.shift();
                                  fb_instance_stream.push({
                                        n: username,
                                        m: currentText,
                                        v: vid,
                                        c: my_color
                                    });
                                    currentText = "";
                                    
                                } else {
                                    currentText += wordArr[i] + " ";
                                }
                            }

                            if (currentText !== "")
                                fb_instance_stream.push({
                                    n: username,
                                    m: currentText,
                                    c: my_color
                                });

                            msg_data.length = 0;
                            $(obj).val("");
                        }
                    }, 3001);

                
              }
            } else {
                if (has_emotions(lastWord)) {
                    this_blob = cur_video_blob;
                    msg_data.push(this_blob);
                }


                //if an enter was pressed
                if (event.which == 13) {

                    console.log(msg_data);
                    var currentText = "";
                    for (var i = 0; i <= wordArr.length - 1; i++) {
                        if (!has_emotions(wordArr[i]) && wordArr[i].indexOf('[REC]:') == -1) {
                            currentText += wordArr[i] + " ";
                        } else {
                            var vid = msg_data.shift();
                            fb_instance_stream.push({
                                n: username,
                                m: currentText,
                                v: vid,
                                c: my_color
                            });
                            currentText = "";
                        }
                    }

                    if (currentText !== "")
                        fb_instance_stream.push({
                            n: username,
                            m: currentText,
                            c: my_color
                        });

                    msg_data.length = 0;
                    $(this).val("");

                } 
            } 



        });
    }

    function MessageBox(text, video) {
        var textBox = document.createElement("DIV");
        textBox.setAttribute("class", "message-box");
        var cropDiv = document.createElement("DIV");
        cropDiv.setAttribute("class", "cropDiv");
        if (video != null) {
            cropDiv.appendChild(video);
            textBox.appendChild(cropDiv);
        }
        var textWrapper = document.createElement("P");
        textWrapper.innerHTML = text;
        textBox.appendChild(textWrapper);
        return textBox;

    }

    // creates a message node and appends it to the conversation
    function display_msg(data) {

        if (data.n == null) {
            $("#conversation").append("<div class='msg' style='color:" + data.c + "'>" + data.m + "</div>");
        } else {
            if (data.n == users[0])
                $("#conversation").append("<div class='user2_msg' style='color:" + data.c + "'><b>" + data.n + "</b></div>");
            else
                $("#conversation").append("<div class='user1_msg' style='color:" + data.c + "'><b>" + data.n + "</b></div>");
            var video = null;
            if (data.v) {
                // for video element
                video = document.createElement("video");
                video.autoplay = true;
                video.controls = false; // optional
                video.loop = true;
                video.width = 240;

                var source = document.createElement("source");
                source.src = URL.createObjectURL(base64_to_blob(data.v));
                source.type = "video/webm";

                video.appendChild(source);
            }

            var messageBox = new MessageBox(data.m, video);

            // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
            // var video = document.createElement("img");
            // video.src = URL.createObjectURL(base64_to_blob(data.v));

            var messageWrapper = document.createElement("DIV");
            if (data.n == null)
                messageWrapper.setAttribute("class", "msg");
            else if (data.n == users[0])
                messageWrapper.setAttribute("class", "user2_msg");
            else
                messageWrapper.setAttribute("class", "user3_msg");

            messageWrapper.appendChild(messageBox);
            document.getElementById("conversation").appendChild(messageWrapper);
        }

        // Scroll to the bottom every time we display a new message
        scroll_to_bottom("conversation", 0);
    }

    function scroll_to_bottom(divID, wait_time) {
        // scroll to bottom of div
        setTimeout(function () {
            $(divID).animate({
                scrollTop: $(divID).height()
            }, 200);
        }, wait_time);
    }

    function connect_webcam() {
        // we're only recording video, not audio
        var mediaConstraints = {
            video: true,
            audio: false
        };

        // callback for when we get video stream from user.
        var onMediaSuccess = function (stream) {
            // create video element, attach webcam stream to video element
            var video_width = 240;
            var video_height = 240;
            var webcam_stream = document.getElementById('webcam_stream');
            var video = document.createElement('video');
            webcam_stream.innerHTML = "";
            // adds these properties to the video
            video = mergeProps(video, {
                controls: false,
                width: video_width,
                height: video_height,
                src: URL.createObjectURL(stream)
            });
            video.play();
            webcam_stream.appendChild(video);

            // counter
            var time = 0;
            var second_counter = document.getElementById('second_counter');
            var second_counter_update = setInterval(function () {
                second_counter.innerHTML = time++;
            }, 1000);

            // now record stream in 5 seconds interval
            var video_container = document.getElementById('video_container');
            mediaRecorder = new MediaStreamRecorder(stream);
            var index = 1;

            mediaRecorder.mimeType = 'video/webm';
            // mediaRecorder.mimeType = 'image/gif';
            // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
            mediaRecorder.video_width = 240;
            mediaRecorder.video_height = 240;

            mediaRecorder.ondataavailable = function (blob) {
                console.log("new data available!");
                //video_container.innerHTML = "";

                // convert data into base 64 blocks
                blob_to_base64(blob, function (b64_data) {
                    cur_video_blob = b64_data;
                });
            };


            timer = setInterval(function () {
                mediaRecorder.stop();
                mediaRecorder.start(3000);
            }, 3000);


            console.log("connect to media stream!");
        }

        // callback if there is an error when we try and get the video stream
        var onMediaError = function (e) {
            console.error('media error', e);
        }

        // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
        navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
    }

    // check to see if a message qualifies to be replaced with video.
    var has_emotions = function (msg) {
        var options = ["lol", ":)", ":(", "facepalm", ":D", ":P", "-_-", ";)", ";D", ";P"];
        for (var i = 0; i < options.length; i++) {
            if (msg.indexOf(options[i]) != -1) {
                return true;
            }
        }
        return false;
    }


    // some handy methods for converting blob to base 64 and vice versa
    // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
    // note useing String.fromCharCode.apply can cause callstack error
    var blob_to_base64 = function (blob, callback) {
        var reader = new FileReader();
        reader.onload = function () {
            var dataUrl = reader.result;
            var base64 = dataUrl.split(',')[1];
            callback(base64);
        };
        reader.readAsDataURL(blob);
    };

    var base64_to_blob = function (base64) {
        var binary = atob(base64);
        var len = binary.length;
        var buffer = new ArrayBuffer(len);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < len; i++) {
            view[i] = binary.charCodeAt(i);
        }
        var blob = new Blob([view]);
        return blob;
    };

})();