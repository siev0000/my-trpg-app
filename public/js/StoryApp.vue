<template>
    <div id="app-shell">
        <iframe id="load-screen" src="load.html"></iframe>

        <div id="app-stage" :style="stageStyle">
            <div id="main-content" class="container">
                <div id="top-left"></div>
                <div id="top-right"></div>
            </div>

            <div id="bottom"></div>

            <div id="confirm-modal" class="modal-overlay">
                <div class="modal-content">
                    <h2>確認</h2>
                    <p id="confirm-modal-message"></p>
                    <div class="modal-buttons">
                        <button id="confirm-modal-yes">はい</button>
                        <button id="confirm-modal-no">いいえ</button>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" style="display: none;" onclick="closeDiceModal()"></div>
            <div id="dice-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <h2>ダイス設定</h2>
                    <label for="dice-modal-count">ダイス数:</label>
                    <input type="number" id="dice-modal-count" min="1" value="1">

                    <label for="dice-modal-value">ダイス値:</label>
                    <input type="number" id="dice-modal-value" min="1" value="100">

                    <button id="save-dice-settings" onclick="syncDiceSettingsFromModal()">保存</button>
                    <button onclick="closeDiceModal()">キャンセル</button>
                </div>
            </div>

            <ConditionPassiveModal />
            <SkillSetModal />
            <EquipCompareModal />
            <ResourceAdjustModal />
            <DetailModal />
            <TurnAdvanceModal />
        </div>
    </div>
</template>

<script>
import DetailModal from './components/DetailModal.vue';
import ConditionPassiveModal from './components/ConditionPassiveModal.vue';
import SkillSetModal from './components/SkillSetModal.vue';
import EquipCompareModal from './components/EquipCompareModal.vue';
import ResourceAdjustModal from './components/ResourceAdjustModal.vue';
import TurnAdvanceModal from './components/TurnAdvanceModal.vue';
import { installGlobalModalInteractionGuard, triggerPostModalInteractionGuard } from './utils/modalInteractionGuard.js';

export default {
    name: 'StoryApp',
    components: {
        DetailModal,
        ConditionPassiveModal,
        SkillSetModal,
        EquipCompareModal,
        ResourceAdjustModal
        ,TurnAdvanceModal
    },
    data() {
        return {
            baseWidth: 720,
            baseHeight: 1280,
            stageStyle: {
                transform: 'translate(0px, 0px) scale(1)'
            },
            handleResize: null,
            beforeUnloadHandler: null,
            scrollableTable: null,
            mouseLeaveHandler: null,
        };
    },
    mounted() {
        this.initializeGlobalState();
        this.bindGlobalHelpers();

        this.updateScale();

        this.handleResize = () => this.updateScale();
        window.addEventListener('resize', this.handleResize, { passive: true });
        window.addEventListener('orientationchange', this.handleResize, { passive: true });

        this.beforeUnloadHandler = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', this.beforeUnloadHandler);

        this.loadAllSections();

        document.body.style.overflow = 'hidden';
        this.scrollableTable = document.getElementById('bottom');
        if (this.scrollableTable) {
            this.mouseLeaveHandler = () => {
                document.body.style.overflow = 'hidden';
            };
            this.scrollableTable.addEventListener('mouseleave', this.mouseLeaveHandler);
        }
    },
    beforeUnmount() {
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
            window.removeEventListener('orientationchange', this.handleResize);
        }

        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        }

        if (this.scrollableTable && this.mouseLeaveHandler) {
            this.scrollableTable.removeEventListener('mouseleave', this.mouseLeaveHandler);
        }
    },
    methods: {
        initializeGlobalState() {
            const characters = JSON.parse(sessionStorage.getItem('selectedCharacters')) || [];
            const selectedCharacter = JSON.parse(sessionStorage.getItem('selectedCharacter')) || [];

            window.characters = characters;
            window.selectedCharacter = selectedCharacter;
            window.statusCharacter = selectedCharacter[0] || {};
        },
        bindGlobalHelpers() {
            installGlobalModalInteractionGuard();
            window.openConfirmModal = (message, callback) => this.openConfirmModal(message, callback);
            window.closeConfirmModal = () => this.closeConfirmModal();
            window.loadSection = (sectionId, htmlPath, jsPath, onLoaded) =>
                this.loadSection(sectionId, htmlPath, jsPath, onLoaded);
        },
        updateScale() {
            const viewportWidth = window.innerWidth || this.baseWidth;
            const viewportHeight = window.innerHeight || this.baseHeight;
            const widthScale = viewportWidth / this.baseWidth;
            const heightScale = viewportHeight / this.baseHeight;

            // contain: 見切れないように画面内へ収める
            const scale = Math.min(widthScale, heightScale);
            const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

            const offsetX = Math.round((viewportWidth - this.baseWidth * safeScale) / 2);
            const offsetY = Math.round((viewportHeight - this.baseHeight * safeScale) / 2);

            this.stageStyle = {
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${safeScale})`
            };
        },
        async loadSection(sectionId, htmlPath, jsPath, onLoaded) {
            const waitScriptLoaded = (scriptElement) => new Promise((resolve, reject) => {
                const handleLoad = () => {
                    scriptElement.dataset.dynamicLoaded = 'true';
                    scriptElement.removeEventListener('load', handleLoad);
                    scriptElement.removeEventListener('error', handleError);
                    resolve();
                };
                const handleError = () => {
                    scriptElement.removeEventListener('load', handleLoad);
                    scriptElement.removeEventListener('error', handleError);
                    reject(new Error(`Failed to load script: ${scriptElement.src || ''}`));
                };
                scriptElement.addEventListener('load', handleLoad, { once: true });
                scriptElement.addEventListener('error', handleError, { once: true });
            });

            const response = await fetch(htmlPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${htmlPath}`);
            }

            const html = await response.text();
            const target = document.getElementById(sectionId);
            if (!target) {
                return;
            }
            target.innerHTML = html;

            const scriptPaths = Array.isArray(jsPath)
                ? jsPath.filter((path) => typeof path === 'string' && path.trim())
                : (typeof jsPath === 'string' && jsPath.trim() ? [jsPath] : []);
            for (const scriptPath of scriptPaths) {
                const existingScript = document.querySelector(`script[data-dynamic-script="${scriptPath}"]`);
                if (existingScript) {
                    const alreadyLoaded = existingScript.dataset.dynamicLoaded === 'true';
                    if (!alreadyLoaded) {
                        await waitScriptLoaded(existingScript);
                    }
                    continue;
                }

                const script = document.createElement('script');
                script.src = scriptPath;
                script.dataset.dynamicScript = scriptPath;
                script.dataset.dynamicLoaded = 'false';
                document.head.appendChild(script);
                await waitScriptLoaded(script);
            }

            if (typeof onLoaded === 'function') {
                await onLoaded();
            }
        },
        async loadAllSections() {
            try {
                await this.loadSection('bottom', '/sections/skill-container.html', [
                    '/js/skill-power/skillValueFormula.js',
                    '/js/skill-power/powerJudge.js',
                    '/js/skillContainer.js'
                ]);
                window.DebaglogSet?.('bottom section loaded successfully');
            } catch (error) {
                console.error('Failed to load sections:', error);
            }
        },
        openConfirmModal(message, callback) {
            const messageElement = document.getElementById('confirm-modal-message');
            const modalElement = document.getElementById('confirm-modal');
            const yesButton = document.getElementById('confirm-modal-yes');
            const noButton = document.getElementById('confirm-modal-no');

            if (!messageElement || !modalElement || !yesButton || !noButton) {
                return;
            }

            messageElement.textContent = message;
            modalElement.style.display = 'flex';

            yesButton.onclick = () => {
                this.closeConfirmModal();
                if (typeof callback === 'function') {
                    callback(true);
                }
            };

            noButton.onclick = () => {
                this.closeConfirmModal();
                if (typeof callback === 'function') {
                    callback(false);
                }
            };
        },
        closeConfirmModal() {
            const modalElement = document.getElementById('confirm-modal');
            if (modalElement) {
                modalElement.style.display = 'none';
                triggerPostModalInteractionGuard();
            }
        },
    }
};
</script>

<style>
#load-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    border: none;
    z-index: 1000;
}

.modal {
    align-items: center;
    justify-content: center;
    position: fixed;
    z-index: 2000;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
}

.modal-content {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    width: 55%;
    margin: 65% auto;
    font-size: 1.5em;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    position: relative;
    text-align: center;
}

.modal-message {
    margin: 20px 0;
    font-size: 1.2em;
}

.cancel-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 1.2em;
    cursor: pointer;
    color: #888;
}

.cancel-btn:hover {
    color: #555;
}

.select-button-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 15px;
}

#slot-select {
    font-size: 1em;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.set-btn {
    padding: 8px 16px;
    font-size: 1em;
    color: white;
    background-color: #4CAF50;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.set-btn:hover {
    background-color: #45a049;
}
</style>
