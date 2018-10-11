import BaseMessageCounterPlugin from "./baseMessageCounterPlugin";

export default class UnreadOnFavicon extends BaseMessageCounterPlugin {
    public async init(): Promise<void> {
        this.setUpObserver("head",
            { attributes: true, childList: true, subtree: true },
            (n, _) => {
                const favicon = n.filter(n => n.id === "favicon")[0];
                if (favicon) {
                    let tautFavicon = document.getElementById("taut-favicon") as HTMLLinkElement;
                    if (!tautFavicon) {
                        tautFavicon = document.createElement("link");
                        tautFavicon.id = "taut-favicon";
                        tautFavicon.rel = "shortcut icon";
                        tautFavicon.type = "image/png";
                        document.head.appendChild(tautFavicon);
                    }

                    this.unreadChanged();
                }
            });
    }

    protected unreadChanged() {
        const originalFavicon = document.getElementById("favicon") as HTMLLinkElement;
        if (!originalFavicon) {
            return;
        }

        // remove the rel attribute so that it uses my favicon
        originalFavicon.rel = "";

        const tautFavicon = document.getElementById("taut-favicon") as HTMLLinkElement;
        const currentUnread = this.getLocalValue("currentUnread");
        if (!currentUnread) {
            // use the original one!
            tautFavicon.href = originalFavicon.href;
            return;
        }

        // Idea borrowed from https://medium.com/@alperen.talaslioglu/building-dynamic-favicon-with-javascript-223ad7999661
        const faviconSize = 16;
        const canvas = document.createElement("canvas");
        canvas.width = faviconSize;
        canvas.height = faviconSize;

        const context = canvas.getContext("2d");
        const img = document.createElement("img");
        img.src = originalFavicon.href;

        img.onload = () => {
            const currentUnread = this.getLocalValue("currentUnread");
            if (!currentUnread) {
                // use the original one!
                tautFavicon.href = originalFavicon.href;
                return;
            }

            // Draw Original Favicon as Background
            context.drawImage(img, 0, 0, faviconSize, faviconSize);

            // Draw Notification Number
            context.fillStyle = "white";
            context.strokeStyle = "black";
            context.lineWidth = 3;
            context.font = "10px Tahoma";
            context.textAlign = "right";
            context.textBaseline = "bottom";
            context.strokeText(currentUnread, canvas.width - 2, canvas.height);
            context.fillText(currentUnread, canvas.width - 2, canvas.height);

            // Replace favicon
            tautFavicon.href = canvas.toDataURL("image/png");
        };
    }
}
