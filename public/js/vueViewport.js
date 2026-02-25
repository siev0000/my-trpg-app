(function () {
    "use strict";

    function wrapStage() {
        const body = document.body;
        if (!body || document.getElementById("app-shell")) {
            return;
        }

        const loadScreen = document.getElementById("load-screen");
        const appShell = document.createElement("div");
        appShell.id = "app-shell";

        const appStage = document.createElement("div");
        appStage.id = "app-stage";
        appShell.appendChild(appStage);

        if (loadScreen && loadScreen.parentNode === body) {
            body.insertBefore(appShell, loadScreen.nextSibling);
        } else {
            body.insertBefore(appShell, body.firstChild);
        }

        const movableNodes = Array.from(body.children).filter((element) => {
            return element !== loadScreen && element !== appShell && element.tagName !== "SCRIPT";
        });

        movableNodes.forEach((element) => {
            appStage.appendChild(element);
        });
    }

    function applyStageTransform(width, height, scale, offsetX, offsetY) {
        const appStage = document.getElementById("app-stage");
        if (!appStage) {
            return;
        }

        appStage.style.width = width + "px";
        appStage.style.height = height + "px";
        appStage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    function calculateViewportScale(baseWidth, baseHeight) {
        const viewportWidth = window.innerWidth || baseWidth;
        const viewportHeight = window.innerHeight || baseHeight;
        const scale = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight);
        const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

        return {
            scale: safeScale,
            offsetX: Math.round((viewportWidth - baseWidth * safeScale) / 2),
            offsetY: Math.round((viewportHeight - baseHeight * safeScale) / 2)
        };
    }

    function mountVueViewport() {
        const baseWidth = 720;
        const baseHeight = 1280;

        if (!window.Vue || typeof window.Vue.createApp !== "function") {
            const updateScale = function () {
                const result = calculateViewportScale(baseWidth, baseHeight);
                applyStageTransform(baseWidth, baseHeight, result.scale, result.offsetX, result.offsetY);
            };

            updateScale();
            window.addEventListener("resize", updateScale, { passive: true });
            window.addEventListener("orientationchange", updateScale, { passive: true });
            return;
        }

        const vueMountPoint = document.createElement("div");
        vueMountPoint.id = "vue-scale-root";
        vueMountPoint.style.display = "none";
        document.body.appendChild(vueMountPoint);

        const app = window.Vue.createApp({
            data() {
                return {
                    baseWidth,
                    baseHeight,
                    scale: 1,
                    offsetX: 0,
                    offsetY: 0
                };
            },
            methods: {
                updateScale() {
                    const result = calculateViewportScale(this.baseWidth, this.baseHeight);
                    this.scale = result.scale;
                    this.offsetX = result.offsetX;
                    this.offsetY = result.offsetY;
                    applyStageTransform(this.baseWidth, this.baseHeight, this.scale, this.offsetX, this.offsetY);
                }
            },
            mounted() {
                this.updateScale();
                window.addEventListener("resize", this.updateScale, { passive: true });
                window.addEventListener("orientationchange", this.updateScale, { passive: true });
            },
            unmounted() {
                window.removeEventListener("resize", this.updateScale);
                window.removeEventListener("orientationchange", this.updateScale);
            }
        });

        app.mount("#vue-scale-root");
    }

    function init() {
        wrapStage();
        mountVueViewport();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
