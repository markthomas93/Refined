/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/background.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/background.ts":
/*!***************************!*\
  !*** ./src/background.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports) {

function injectScript(source, data) {
    var elem = document.createElement("script");
    elem.type = "text/javascript";
    elem.innerHTML = `(${source})(${data})`;
    document.documentElement.appendChild(elem);
}
chrome.storage.sync.get(['settings'], res => {
    injectScript(function (settings) {
        const hidden_ids = settings.hidden_ids ? settings.hidden_ids.split(",").map(s => s.trim()) : [];
        function bindResponse(request, response) {
            request.__defineGetter__("responseText", function () {
                return response;
            });
            request.__defineGetter__("response", function () {
                return response;
            });
        }
        function filterMessages(messages) {
            // remove hidden bots
            messages = messages.filter(m => hidden_ids.indexOf(m.bot_id) === -1 && hidden_ids.indexOf(m.user) === -1);
            // remove reactions and files
            messages = messages.map(m => {
                if (m.text) {
                    m.text = m.text.replace(/\[([^\]]+)\]\(<([^\)]+)>\)/g, (_, text, url) => `<${url}|${text}>`);
                }
                if (m.reactions && settings.only_my_reactions) {
                    if (m.user != my_id) {
                        m.reactions = m.reactions.filter(r => r.users.indexOf(my_id) !== -1);
                    }
                    if (!m.reactions.length) {
                        delete m.reactions;
                    }
                }
                if (m.files && settings.hide_gdrive_preview) {
                    m.files = m.files.filter(f => f.external_type !== "gdrive");
                    if (!m.files.length) {
                        delete m.files;
                    }
                }
                if (m.attachments && settings.hide_url_previews) {
                    m.attachments = m.attachments.filter(m => !m.from_url);
                    if (!m.attachments) {
                        delete m.attachments;
                    }
                }
                return m;
            });
            return messages;
        }
        function processConversationsView(request) {
            const data = JSON.parse(request.responseText);
            if (data.ok) {
                my_id = data.self.id;
                data.history.messages = filterMessages(data.history.messages);
                bindResponse(request, JSON.stringify(data));
            }
        }
        function processConversations(request) {
            const data = JSON.parse(request.responseText);
            if (data.ok) {
                data.messages = filterMessages(data.messages);
                bindResponse(request, JSON.stringify(data));
            }
        }
        var my_id = '';
        var proxied = window.XMLHttpRequest.prototype.open;
        const re = /@([^@>]+)>/g;
        window.XMLHttpRequest.prototype.open = function (method, path, async) {
            let oldListener = e => { };
            if (this.onreadystatechange) {
                oldListener = this.onreadystatechange.bind(this);
            }
            if (path == '/api/conversations.view') {
                this.onreadystatechange = e => {
                    if (this.readyState == 4) {
                        processConversationsView(this);
                    }
                    oldListener(e);
                };
            }
            else if (path.match(/\/api\/conversations\.history/)) {
                this.onreadystatechange = e => {
                    if (this.readyState == 4) {
                        processConversations(this);
                    }
                    oldListener(e);
                };
            }
            else if (path.startsWith('/api/chat.postMessage')) {
                const oldSend = this.send.bind(this);
                this.send = function (e) {
                    const originalText = e.get('text');
                    let finalText = originalText.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, text, url) => `<${url}|${text}>`);
                    if (settings.hangout_url) {
                        const w = window;
                        var lMessage = finalText.toLowerCase();
                        var userNames = [w.TS.model.user.profile.display_name];
                        var match;
                        if (lMessage.indexOf("hangout ") === 0) {
                            var name = finalText.substring(8);
                            var url;
                            while (match = re.exec(name)) {
                                userNames.push(match[1]);
                            }
                            if (userNames.length > 1) {
                                userNames = userNames.map(u => u.normalize('NFD').replace(/[\u0300-\u036f]/g, ""));
                                userNames.sort();
                                url = userNames.join('-');
                            }
                            else {
                                // just use the text separated by hyphens
                                url = name.replace(' ', '-');
                            }
                            url = url.toLowerCase().replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
                            finalText = `hangout ${name}: ${settings.hangout_url.replace('$name$', url)}`;
                        }
                    }
                    if (e.get('reply_broadcast') === "true") {
                        [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
                            el.checked = true;
                        });
                    }
                    e.set('text', finalText);
                    oldSend(e);
                }.bind(this);
            }
            return proxied.apply(this, [].slice.call(arguments));
        };
        // proxy the window.WebSocket object
        var WebSocketProxy = new Proxy(window.WebSocket, {
            construct: function (target, args) {
                function bindWebSocketData(event, data) {
                    event.__defineGetter__("data", function () {
                        return data;
                    });
                }
                // create WebSocket instance
                const instance = new target(...args);
                const messageHandler = (event) => {
                    let data = JSON.parse(event.data);
                    if (data.type === "reaction_added" && settings.only_my_reactions) {
                        if (data.user != my_id && data.item_user != my_id) {
                            data = {};
                        }
                    }
                    else if (data.type === "message") {
                        // hide ignored users
                        if (hidden_ids.indexOf(data.user) !== -1 || hidden_ids.indexOf(data.bot_id) !== -1) {
                            data = {};
                        }
                        // did somebody send a markdown link? parse it!
                        if (data.text) {
                            data.text = data.text.replace(/\[([^\]]+)\]\(<([^\)]+)>\)/g, (_, text, url) => `<${url}|${text}>`);
                        }
                        // when it comes with an attachment, it's in here
                        if (data.message && data.message.text) {
                            data.message.text = data.message.text.replace(/\[([^\]]+)\]\(<([^\)]+)>\)/g, (_, text, url) => `<${url}|${text}>`);
                        }
                        // hide gdrive if needed
                        if (settings.hide_gdrive_preview && data.message && data.message.files) {
                            data.message.files = data.message.files.filter(f => f.external_type !== "gdrive");
                            if (!data.message.files.length) {
                                delete data.message.files;
                            }
                        }
                        // hide preview urls if needed
                        if (settings.hide_url_previews && data.message && data.message.attachments) {
                            data.message.attachments = data.message.attachments.filter(m => !m.from_url);
                            if (!data.message.attachments) {
                                delete data.message.attachments;
                            }
                        }
                        if (settings.unread_on_title) {
                            const w = window;
                            if (data.channel == w.CurrentChannelId) {
                                // this is a bit weird... they always send a message, even if it's a message inside a thread
                                // they then send the message_repied event, and if it's a threaded message also sent to the channel
                                // then they send a message_changed event without an edited property
                                // what are you saying? that this is a hack? yes, the whole thing is
                                if (!data.subtype) {
                                    // it's a message...
                                    if (!data.thread_ts) {
                                        // it's not in a thread!
                                        w.CurrentUnread++;
                                    }
                                }
                                else if (data.subtype === 'message_changed') {
                                    // message_changed, we still don't know much about it
                                    if (!data.message.edited) {
                                        // when a threaded message is sent to the chat, there's no edited property. Are there any
                                        // other instances when this happens? I have no freaking idea :)
                                        w.CurrentUnread++;
                                    }
                                }
                                let title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, '');
                                if (w.CurrentUnread) {
                                    document.title = `(${w.CurrentUnread}) ${title}`;
                                }
                                else {
                                    document.title = title;
                                }
                            }
                        }
                    }
                    bindWebSocketData(event, JSON.stringify(data));
                };
                instance.addEventListener('message', messageHandler);
                // return the WebSocket instance
                return instance;
            }
        });
        // replace the native WebSocket with the proxy
        window.WebSocket = WebSocketProxy;
        if (settings.threads_on_channel) {
            // always reply to the channel... TODO: Don't use DOMNodeInserted
            document.addEventListener('DOMNodeInserted', function (e) {
                const cl = e.target.classList;
                if (cl && cl.contains('reply_container_info')) {
                    [...document.getElementsByClassName('reply_broadcast_toggle')].forEach(el => {
                        el.checked = true;
                    });
                }
            });
        }
        let css = '';
        if (settings.hide_status_emoji) {
            css += `
.c-custom_status, .message_current_status {
    display: none !important;
}`;
        }
        if (settings.reactions_on_the_right) {
            css += `
.c-reaction_bar {
    position: absolute;
    bottom: 5px;
    right: 1.25rem;
}
.c-message__actions--menu-showing, .c-message__actions {
    top: unset !important;
    bottom: 28px;
}
@media screen and (max-width: 1100px) {
    .c-reaction_bar {
        display: none;
    }
}
.c-reaction_add, .c-reaction_add:hover {
    display: none !important;
}
`;
        }
        if (css) {
            var sheet = document.createElement('style');
            sheet.type = 'text/css';
            window.customSheet = sheet;
            (document.head || document.getElementsByTagName('head')[0]).appendChild(sheet);
            sheet.appendChild(document.createTextNode(css));
        }
        // Fix edit on a message with a link
        var intervalMessageEdit = setInterval(() => {
            const w = window;
            if (w.TS && w.TS.format) {
                clearInterval(intervalMessageEdit);
            }
            else {
                return;
            }
            let old = w.TS.format.formatWithOptions;
            w.TS.format.formatWithOptions = (t, n, r) => {
                if (r && r.for_edit) {
                    t = t.replace(/<([^<>\|]+)\|([^<>]+)>/g, (_, url, title) => `[${title}](${url})`);
                }
                return old(t, n, r);
            };
        }, 200);
        // I had to
        var interval = setInterval(() => {
            var targetNode = document.querySelector(".messages_header");
            if (targetNode) {
                clearInterval(interval);
            }
            else {
                return;
            }
            var observerOptions = {
                childList: true,
                attributes: true,
                subtree: true
            };
            var observer = new MutationObserver((e, observer) => {
                var text = document.getElementById('channel_topic_text');
                if (text && text.innerText === 'Not the Slack complaint room.') {
                    text.innerHTML = '<strike>Not</strike> the Slack <strike>complaint</strike> <span style="color: red; font-weight: bold">modding</span> room.';
                }
            });
            observer.observe(targetNode, observerOptions);
        }, 200);
        if (settings.unread_on_title) {
            // Avoid adding * or ! on the title
            var targetNode = document.querySelector('title');
            var config = { attributes: true, childList: true, subtree: true };
            var callback = function () {
                if (document.title.startsWith('*') || document.title.startsWith('!')) {
                    document.title = document.title.substring(2);
                }
            };
            var observer = new MutationObserver(callback);
            observer.observe(targetNode, config);
        }
        // react monkey patch
        var reactInterval = setInterval(() => {
            const w = window;
            if (w.React && w.React.createElement) {
                clearInterval(reactInterval);
            }
            else {
                return;
            }
            // Store the original function
            const originalCreateElement = w.React.createElement;
            // Define a new function
            w.React.createElement = function () {
                // Get our arguments as an array
                const args = Array.prototype.slice.call(arguments);
                const response = originalCreateElement.apply(w.React, args);
                const displayName = args[0].displayName;
                if (displayName) {
                    const props = response.props;
                    if (settings.unread_on_title) {
                        // store the current channel id
                        if (displayName === 'MessagePane' && props.channelId) {
                            w.CurrentChannelId = props.channelId;
                        }
                        // make sure we unset the title marker when we have to
                        if (displayName === 'UnreadBanner' && props.channelId) {
                            if (!props.hasUnreads) {
                                w.CurrentUnread = 0;
                                document.title = document.title.replace(/^(([\*!] )|(\([0-9]+\) ))*/, '');
                            }
                        }
                    }
                }
                return response;
            };
        }, 100);
    }, res.settings || '{}');
});


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vc3JjL2JhY2tncm91bmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esa0RBQTBDLGdDQUFnQztBQUMxRTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGdFQUF3RCxrQkFBa0I7QUFDMUU7QUFDQSx5REFBaUQsY0FBYztBQUMvRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaURBQXlDLGlDQUFpQztBQUMxRSx3SEFBZ0gsbUJBQW1CLEVBQUU7QUFDckk7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7O0FBR0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDbEZBLFNBQVMsWUFBWSxDQUFDLE1BQThCLEVBQUUsSUFBWTtJQUM5RCxJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVDLElBQUksQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUM7SUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLE1BQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQztJQUN4QyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMs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LElBQUksSUFBSSxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGdldHRlciB9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbiBcdFx0fVxuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4gXHQvLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbiBcdC8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4gXHQvLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuIFx0XHRpZihtb2RlICYgMSkgdmFsdWUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKHZhbHVlKTtcbiBcdFx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcbiBcdFx0aWYoKG1vZGUgJiA0KSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcbiBcdFx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5zLCAnZGVmYXVsdCcsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xuIFx0XHRpZihtb2RlICYgMiAmJiB0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIGZvcih2YXIga2V5IGluIHZhbHVlKSBfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGtleSwgZnVuY3Rpb24oa2V5KSB7IHJldHVybiB2YWx1ZVtrZXldOyB9LmJpbmQobnVsbCwga2V5KSk7XG4gXHRcdHJldHVybiBucztcbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSBcIi4vc3JjL2JhY2tncm91bmQudHNcIik7XG4iLCJmdW5jdGlvbiBpbmplY3RTY3JpcHQoc291cmNlOiAoZGF0YTogc3RyaW5nKSA9PiB2b2lkLCBkYXRhOiBzdHJpbmcpIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgZWxlbS50eXBlID0gXCJ0ZXh0L2phdmFzY3JpcHRcIjtcbiAgICBlbGVtLmlubmVySFRNTCA9IGAoJHtzb3VyY2V9KSgke2RhdGF9KWA7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKGVsZW0pO1xufVxuXG5jaHJvbWUuc3RvcmFnZS5zeW5jLmdldChbJ3NldHRpbmdzJ10sIHJlcyA9PiB7XG4gICAgaW5qZWN0U2NyaXB0KGZ1bmN0aW9uIChzZXR0aW5nczogYW55KSB7XG4gICAgICAgIGNvbnN0IGhpZGRlbl9pZHMgPSBzZXR0aW5ncy5oaWRkZW5faWRzID8gc2V0dGluZ3MuaGlkZGVuX2lkcy5zcGxpdChcIixcIikubWFwKHMgPT4gcy50cmltKCkpIDogW107XG5cbiAgICAgICAgZnVuY3Rpb24gYmluZFJlc3BvbnNlKHJlcXVlc3QsIHJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXF1ZXN0Ll9fZGVmaW5lR2V0dGVyX18oXCJyZXNwb25zZVRleHRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXF1ZXN0Ll9fZGVmaW5lR2V0dGVyX18oXCJyZXNwb25zZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZpbHRlck1lc3NhZ2VzKG1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAvLyByZW1vdmUgaGlkZGVuIGJvdHNcbiAgICAgICAgICAgIG1lc3NhZ2VzID0gbWVzc2FnZXMuZmlsdGVyKG0gPT4gaGlkZGVuX2lkcy5pbmRleE9mKG0uYm90X2lkKSA9PT0gLTEgJiYgaGlkZGVuX2lkcy5pbmRleE9mKG0udXNlcikgPT09IC0xKTtcblxuICAgICAgICAgICAgLy8gcmVtb3ZlIHJlYWN0aW9ucyBhbmQgZmlsZXNcbiAgICAgICAgICAgIG1lc3NhZ2VzID0gbWVzc2FnZXMubWFwKG0gPT4ge1xuICAgICAgICAgICAgICAgIGlmIChtLnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbS50ZXh0ID0gbS50ZXh0LnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKDwoW15cXCldKyk+XFwpL2csIChfLCB0ZXh0LCB1cmwpID0+IGA8JHt1cmx9fCR7dGV4dH0+YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtLnJlYWN0aW9ucyAmJiBzZXR0aW5ncy5vbmx5X215X3JlYWN0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobS51c2VyICE9IG15X2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtLnJlYWN0aW9ucyA9IG0ucmVhY3Rpb25zLmZpbHRlcihyID0+IHIudXNlcnMuaW5kZXhPZihteV9pZCkgIT09IC0xKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIW0ucmVhY3Rpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG0ucmVhY3Rpb25zO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtLmZpbGVzICYmIHNldHRpbmdzLmhpZGVfZ2RyaXZlX3ByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgbS5maWxlcyA9IG0uZmlsZXMuZmlsdGVyKGYgPT4gZi5leHRlcm5hbF90eXBlICE9PSBcImdkcml2ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtLmZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG0uZmlsZXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG0uYXR0YWNobWVudHMgJiYgc2V0dGluZ3MuaGlkZV91cmxfcHJldmlld3MpIHtcbiAgICAgICAgICAgICAgICAgICAgbS5hdHRhY2htZW50cyA9IG0uYXR0YWNobWVudHMuZmlsdGVyKG0gPT4gIW0uZnJvbV91cmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW0uYXR0YWNobWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBtLmF0dGFjaG1lbnRzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb25zVmlldyhyZXF1ZXN0KSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBpZiAoZGF0YS5vaykge1xuICAgICAgICAgICAgICAgIG15X2lkID0gZGF0YS5zZWxmLmlkO1xuICAgICAgICAgICAgICAgIGRhdGEuaGlzdG9yeS5tZXNzYWdlcyA9IGZpbHRlck1lc3NhZ2VzKGRhdGEuaGlzdG9yeS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgYmluZFJlc3BvbnNlKHJlcXVlc3QsIEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByb2Nlc3NDb252ZXJzYXRpb25zKHJlcXVlc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2VUZXh0KTtcblxuICAgICAgICAgICAgaWYgKGRhdGEub2spIHtcbiAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2VzID0gZmlsdGVyTWVzc2FnZXMoZGF0YS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgYmluZFJlc3BvbnNlKHJlcXVlc3QsIEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBteV9pZCA9ICcnO1xuICAgICAgICB2YXIgcHJveGllZCA9ICh3aW5kb3cgYXMgYW55KS5YTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUub3BlbjtcbiAgICAgICAgY29uc3QgcmUgPSAvQChbXkA+XSspPi9nO1xuICAgICAgICAod2luZG93IGFzIGFueSkuWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAobWV0aG9kLCBwYXRoLCBhc3luYykge1xuICAgICAgICAgICAgbGV0IG9sZExpc3RlbmVyID0gZSA9PiB7IH07XG4gICAgICAgICAgICBpZiAodGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICBvbGRMaXN0ZW5lciA9IHRoaXMub25yZWFkeXN0YXRlY2hhbmdlLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwYXRoID09ICcvYXBpL2NvbnZlcnNhdGlvbnMudmlldycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NDb252ZXJzYXRpb25zVmlldyh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvbGRMaXN0ZW5lcihlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGgubWF0Y2goL1xcL2FwaVxcL2NvbnZlcnNhdGlvbnNcXC5oaXN0b3J5LykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NDb252ZXJzYXRpb25zKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG9sZExpc3RlbmVyKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aC5zdGFydHNXaXRoKCcvYXBpL2NoYXQucG9zdE1lc3NhZ2UnKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFNlbmQgPSB0aGlzLnNlbmQuYmluZCh0aGlzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbFRleHQgPSBlLmdldCgndGV4dCcpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmluYWxUZXh0ID0gb3JpZ2luYWxUZXh0LnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXVxcKChbXlxcKV0rKVxcKS9nLCAoXywgdGV4dCwgdXJsKSA9PiBgPCR7dXJsfXwke3RleHR9PmApO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5oYW5nb3V0X3VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdzogYW55ID0gd2luZG93O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxNZXNzYWdlID0gZmluYWxUZXh0LnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdXNlck5hbWVzID0gW3cuVFMubW9kZWwudXNlci5wcm9maWxlLmRpc3BsYXlfbmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2g7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsTWVzc2FnZS5pbmRleE9mKFwiaGFuZ291dCBcIikgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IGZpbmFsVGV4dC5zdWJzdHJpbmcoOCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVybDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChtYXRjaCA9IHJlLmV4ZWMobmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlck5hbWVzLnB1c2gobWF0Y2hbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1c2VyTmFtZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyTmFtZXMgPSB1c2VyTmFtZXMubWFwKHUgPT4gdS5ub3JtYWxpemUoJ05GRCcpLnJlcGxhY2UoL1tcXHUwMzAwLVxcdTAzNmZdL2csIFwiXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlck5hbWVzLnNvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gdXNlck5hbWVzLmpvaW4oJy0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBqdXN0IHVzZSB0aGUgdGV4dCBzZXBhcmF0ZWQgYnkgaHlwaGVuc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSBuYW1lLnJlcGxhY2UoJyAnLCAnLScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IHVybC50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16QS1aMC05LV0vZywgXCItXCIpLnJlcGxhY2UoLy0rL2csIFwiLVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFRleHQgPSBgaGFuZ291dCAke25hbWV9OiAke3NldHRpbmdzLmhhbmdvdXRfdXJsLnJlcGxhY2UoJyRuYW1lJCcsIHVybCl9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlLmdldCgncmVwbHlfYnJvYWRjYXN0JykgPT09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBbLi4uZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgncmVwbHlfYnJvYWRjYXN0X3RvZ2dsZScpXS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZWwgYXMgYW55KS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZS5zZXQoJ3RleHQnLCBmaW5hbFRleHQpO1xuICAgICAgICAgICAgICAgICAgICBvbGRTZW5kKGUpO1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcm94aWVkLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcHJveHkgdGhlIHdpbmRvdy5XZWJTb2NrZXQgb2JqZWN0XG4gICAgICAgIHZhciBXZWJTb2NrZXRQcm94eSA9IG5ldyBQcm94eSgod2luZG93IGFzIGFueSkuV2ViU29ja2V0LCB7XG4gICAgICAgICAgICBjb25zdHJ1Y3Q6IGZ1bmN0aW9uICh0YXJnZXQsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBiaW5kV2ViU29ja2V0RGF0YShldmVudCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBldmVudC5fX2RlZmluZUdldHRlcl9fKFwiZGF0YVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIFdlYlNvY2tldCBpbnN0YW5jZVxuICAgICAgICAgICAgICAgIGNvbnN0IGluc3RhbmNlID0gbmV3IHRhcmdldCguLi5hcmdzKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VIYW5kbGVyID0gKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS50eXBlID09PSBcInJlYWN0aW9uX2FkZGVkXCIgJiYgc2V0dGluZ3Mub25seV9teV9yZWFjdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnVzZXIgIT0gbXlfaWQgJiYgZGF0YS5pdGVtX3VzZXIgIT0gbXlfaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS50eXBlID09PSBcIm1lc3NhZ2VcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGlkZSBpZ25vcmVkIHVzZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGlkZGVuX2lkcy5pbmRleE9mKGRhdGEudXNlcikgIT09IC0xIHx8IGhpZGRlbl9pZHMuaW5kZXhPZihkYXRhLmJvdF9pZCkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkaWQgc29tZWJvZHkgc2VuZCBhIG1hcmtkb3duIGxpbms/IHBhcnNlIGl0IVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEudGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEudGV4dCA9IGRhdGEudGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCg8KFteXFwpXSspPlxcKS9nLCAoXywgdGV4dCwgdXJsKSA9PiBgPCR7dXJsfXwke3RleHR9PmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIGl0IGNvbWVzIHdpdGggYW4gYXR0YWNobWVudCwgaXQncyBpbiBoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5tZXNzYWdlICYmIGRhdGEubWVzc2FnZS50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlLnRleHQgPSBkYXRhLm1lc3NhZ2UudGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCg8KFteXFwpXSspPlxcKS9nLCAoXywgdGV4dCwgdXJsKSA9PiBgPCR7dXJsfXwke3RleHR9PmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoaWRlIGdkcml2ZSBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy5oaWRlX2dkcml2ZV9wcmV2aWV3ICYmIGRhdGEubWVzc2FnZSAmJiBkYXRhLm1lc3NhZ2UuZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UuZmlsZXMgPSBkYXRhLm1lc3NhZ2UuZmlsZXMuZmlsdGVyKGYgPT4gZi5leHRlcm5hbF90eXBlICE9PSBcImdkcml2ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEubWVzc2FnZS5maWxlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGRhdGEubWVzc2FnZS5maWxlcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhpZGUgcHJldmlldyB1cmxzIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmdzLmhpZGVfdXJsX3ByZXZpZXdzICYmIGRhdGEubWVzc2FnZSAmJiBkYXRhLm1lc3NhZ2UuYXR0YWNobWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UuYXR0YWNobWVudHMgPSBkYXRhLm1lc3NhZ2UuYXR0YWNobWVudHMuZmlsdGVyKG0gPT4gIW0uZnJvbV91cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS5tZXNzYWdlLmF0dGFjaG1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhLm1lc3NhZ2UuYXR0YWNobWVudHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2V0dGluZ3MudW5yZWFkX29uX3RpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdyA9IHdpbmRvdyBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuY2hhbm5lbCA9PSB3LkN1cnJlbnRDaGFubmVsSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhIGJpdCB3ZWlyZC4uLiB0aGV5IGFsd2F5cyBzZW5kIGEgbWVzc2FnZSwgZXZlbiBpZiBpdCdzIGEgbWVzc2FnZSBpbnNpZGUgYSB0aHJlYWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhleSB0aGVuIHNlbmQgdGhlIG1lc3NhZ2VfcmVwaWVkIGV2ZW50LCBhbmQgaWYgaXQncyBhIHRocmVhZGVkIG1lc3NhZ2UgYWxzbyBzZW50IHRvIHRoZSBjaGFubmVsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZW4gdGhleSBzZW5kIGEgbWVzc2FnZV9jaGFuZ2VkIGV2ZW50IHdpdGhvdXQgYW4gZWRpdGVkIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoYXQgYXJlIHlvdSBzYXlpbmc/IHRoYXQgdGhpcyBpcyBhIGhhY2s/IHllcywgdGhlIHdob2xlIHRoaW5nIGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS5zdWJ0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCdzIGEgbWVzc2FnZS4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLnRocmVhZF90cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0J3Mgbm90IGluIGEgdGhyZWFkIVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHcuQ3VycmVudFVucmVhZCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEuc3VidHlwZSA9PT0gJ21lc3NhZ2VfY2hhbmdlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1lc3NhZ2VfY2hhbmdlZCwgd2Ugc3RpbGwgZG9uJ3Qga25vdyBtdWNoIGFib3V0IGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEubWVzc2FnZS5lZGl0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIGEgdGhyZWFkZWQgbWVzc2FnZSBpcyBzZW50IHRvIHRoZSBjaGF0LCB0aGVyZSdzIG5vIGVkaXRlZCBwcm9wZXJ0eS4gQXJlIHRoZXJlIGFueVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG90aGVyIGluc3RhbmNlcyB3aGVuIHRoaXMgaGFwcGVucz8gSSBoYXZlIG5vIGZyZWFraW5nIGlkZWEgOilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3LkN1cnJlbnRVbnJlYWQrK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRpdGxlID0gZG9jdW1lbnQudGl0bGUucmVwbGFjZSgvXigoW1xcKiFdICl8KFxcKFswLTldK1xcKSApKSovLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3LkN1cnJlbnRVbnJlYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnRpdGxlID0gYCgke3cuQ3VycmVudFVucmVhZH0pICR7dGl0bGV9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnRpdGxlID0gdGl0bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBiaW5kV2ViU29ja2V0RGF0YShldmVudCwgSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG1lc3NhZ2VIYW5kbGVyKTtcblxuICAgICAgICAgICAgICAgIC8vIHJldHVybiB0aGUgV2ViU29ja2V0IGluc3RhbmNlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyByZXBsYWNlIHRoZSBuYXRpdmUgV2ViU29ja2V0IHdpdGggdGhlIHByb3h5XG4gICAgICAgICh3aW5kb3cgYXMgYW55KS5XZWJTb2NrZXQgPSBXZWJTb2NrZXRQcm94eTtcblxuICAgICAgICBpZiAoc2V0dGluZ3MudGhyZWFkc19vbl9jaGFubmVsKSB7XG4gICAgICAgICAgICAvLyBhbHdheXMgcmVwbHkgdG8gdGhlIGNoYW5uZWwuLi4gVE9ETzogRG9uJ3QgdXNlIERPTU5vZGVJbnNlcnRlZFxuICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NTm9kZUluc2VydGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjbCA9IChlLnRhcmdldCBhcyBhbnkpLmNsYXNzTGlzdDtcbiAgICAgICAgICAgICAgICBpZiAoY2wgJiYgY2wuY29udGFpbnMoJ3JlcGx5X2NvbnRhaW5lcl9pbmZvJykpIHtcbiAgICAgICAgICAgICAgICAgICAgWy4uLmRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3JlcGx5X2Jyb2FkY2FzdF90b2dnbGUnKV0uZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAoZWwgYXMgYW55KS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY3NzID0gJyc7XG4gICAgICAgIGlmIChzZXR0aW5ncy5oaWRlX3N0YXR1c19lbW9qaSkge1xuICAgICAgICAgICAgY3NzICs9IGBcbi5jLWN1c3RvbV9zdGF0dXMsIC5tZXNzYWdlX2N1cnJlbnRfc3RhdHVzIHtcbiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XG59YDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2V0dGluZ3MucmVhY3Rpb25zX29uX3RoZV9yaWdodCkge1xuICAgICAgICAgICAgY3NzICs9IGBcbi5jLXJlYWN0aW9uX2JhciB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIGJvdHRvbTogNXB4O1xuICAgIHJpZ2h0OiAxLjI1cmVtO1xufVxuLmMtbWVzc2FnZV9fYWN0aW9ucy0tbWVudS1zaG93aW5nLCAuYy1tZXNzYWdlX19hY3Rpb25zIHtcbiAgICB0b3A6IHVuc2V0ICFpbXBvcnRhbnQ7XG4gICAgYm90dG9tOiAyOHB4O1xufVxuQG1lZGlhIHNjcmVlbiBhbmQgKG1heC13aWR0aDogMTEwMHB4KSB7XG4gICAgLmMtcmVhY3Rpb25fYmFyIHtcbiAgICAgICAgZGlzcGxheTogbm9uZTtcbiAgICB9XG59XG4uYy1yZWFjdGlvbl9hZGQsIC5jLXJlYWN0aW9uX2FkZDpob3ZlciB7XG4gICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xufVxuYDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjc3MpIHtcbiAgICAgICAgICAgIHZhciBzaGVldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgICAgICBzaGVldC50eXBlID0gJ3RleHQvY3NzJztcbiAgICAgICAgICAgICh3aW5kb3cgYXMgYW55KS5jdXN0b21TaGVldCA9IHNoZWV0O1xuICAgICAgICAgICAgKGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSkuYXBwZW5kQ2hpbGQoc2hlZXQpO1xuICAgICAgICAgICAgc2hlZXQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaXggZWRpdCBvbiBhIG1lc3NhZ2Ugd2l0aCBhIGxpbmtcbiAgICAgICAgdmFyIGludGVydmFsTWVzc2FnZUVkaXQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB3OiBhbnkgPSB3aW5kb3c7XG4gICAgICAgICAgICBpZiAody5UUyAmJiB3LlRTLmZvcm1hdCkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxNZXNzYWdlRWRpdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgb2xkID0gdy5UUy5mb3JtYXQuZm9ybWF0V2l0aE9wdGlvbnM7XG4gICAgICAgICAgICB3LlRTLmZvcm1hdC5mb3JtYXRXaXRoT3B0aW9ucyA9ICh0LCBuLCByKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHIgJiYgci5mb3JfZWRpdCkge1xuICAgICAgICAgICAgICAgICAgICB0ID0gdC5yZXBsYWNlKC88KFtePD5cXHxdKylcXHwoW148Pl0rKT4vZywgKF8sIHVybCwgdGl0bGUpID0+IGBbJHt0aXRsZX1dKCR7dXJsfSlgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9sZCh0LCBuLCByKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMjAwKTtcblxuICAgICAgICAvLyBJIGhhZCB0b1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0Tm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubWVzc2FnZXNfaGVhZGVyXCIpO1xuICAgICAgICAgICAgaWYgKHRhcmdldE5vZGUpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG9ic2VydmVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzdWJ0cmVlOiB0cnVlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChlLCBvYnNlcnZlcikgPT4ge1xuICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYW5uZWxfdG9waWNfdGV4dCcpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0ICYmIHRleHQuaW5uZXJUZXh0ID09PSAnTm90IHRoZSBTbGFjayBjb21wbGFpbnQgcm9vbS4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRleHQuaW5uZXJIVE1MID0gJzxzdHJpa2U+Tm90PC9zdHJpa2U+IHRoZSBTbGFjayA8c3RyaWtlPmNvbXBsYWludDwvc3RyaWtlPiA8c3BhbiBzdHlsZT1cImNvbG9yOiByZWQ7IGZvbnQtd2VpZ2h0OiBib2xkXCI+bW9kZGluZzwvc3Bhbj4gcm9vbS4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXROb2RlLCBvYnNlcnZlck9wdGlvbnMpO1xuICAgICAgICB9LCAyMDApO1xuXG4gICAgICAgIGlmIChzZXR0aW5ncy51bnJlYWRfb25fdGl0bGUpIHtcbiAgICAgICAgICAgIC8vIEF2b2lkIGFkZGluZyAqIG9yICEgb24gdGhlIHRpdGxlXG4gICAgICAgICAgICB2YXIgdGFyZ2V0Tm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3RpdGxlJylcbiAgICAgICAgICAgIHZhciBjb25maWcgPSB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSB9O1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC50aXRsZS5zdGFydHNXaXRoKCcqJykgfHwgZG9jdW1lbnQudGl0bGUuc3RhcnRzV2l0aCgnIScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnRpdGxlID0gZG9jdW1lbnQudGl0bGUuc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihjYWxsYmFjayk7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKHRhcmdldE5vZGUsIGNvbmZpZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyByZWFjdCBtb25rZXkgcGF0Y2hcbiAgICAgICAgdmFyIHJlYWN0SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB3ID0gd2luZG93IGFzIGFueTtcbiAgICAgICAgICAgIGlmICh3LlJlYWN0ICYmIHcuUmVhY3QuY3JlYXRlRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwocmVhY3RJbnRlcnZhbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RvcmUgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbENyZWF0ZUVsZW1lbnQgPSB3LlJlYWN0LmNyZWF0ZUVsZW1lbnQ7XG5cbiAgICAgICAgICAgIC8vIERlZmluZSBhIG5ldyBmdW5jdGlvblxuICAgICAgICAgICAgdy5SZWFjdC5jcmVhdGVFbGVtZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCBvdXIgYXJndW1lbnRzIGFzIGFuIGFycmF5XG4gICAgICAgICAgICAgICAgY29uc3QgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IG9yaWdpbmFsQ3JlYXRlRWxlbWVudC5hcHBseSh3LlJlYWN0LCBhcmdzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGFyZ3NbMF0uZGlzcGxheU5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BzID0gcmVzcG9uc2UucHJvcHM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZXR0aW5ncy51bnJlYWRfb25fdGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0b3JlIHRoZSBjdXJyZW50IGNoYW5uZWwgaWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5TmFtZSA9PT0gJ01lc3NhZ2VQYW5lJyAmJiBwcm9wcy5jaGFubmVsSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3LkN1cnJlbnRDaGFubmVsSWQgPSBwcm9wcy5jaGFubmVsSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB3ZSB1bnNldCB0aGUgdGl0bGUgbWFya2VyIHdoZW4gd2UgaGF2ZSB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlOYW1lID09PSAnVW5yZWFkQmFubmVyJyAmJiBwcm9wcy5jaGFubmVsSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXByb3BzLmhhc1VucmVhZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdy5DdXJyZW50VW5yZWFkID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQudGl0bGUgPSBkb2N1bWVudC50aXRsZS5yZXBsYWNlKC9eKChbXFwqIV0gKXwoXFwoWzAtOV0rXFwpICkpKi8sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LCAxMDApO1xuXG4gICAgfSwgcmVzLnNldHRpbmdzIHx8ICd7fScpO1xufSk7Il0sInNvdXJjZVJvb3QiOiIifQ==