// キャラクターを追加または更新する関数 帰ってきたデータでダメージや使用スキルを更新できるようにした
function addOrUpdateCharacter(characters, newCharacter) {
    // charactersが配列でない場合は初期化
    if (!Array.isArray(characters)) {
        characters = [];
    }
    window.DebaglogSet?.(`キャラクターを追加または更新する関数 ${characters} `, newCharacter);
    // 同名のキャラクターを探す
    const index = characters.findIndex(char => char.name === newCharacter.name);

    if (index !== -1) {
        // 同名のキャラクターが存在する場合は更新
        characters[index] = { ...characters[index], ...newCharacter };
        window.DebaglogSet?.(`キャラクター ${newCharacter.name} を更新しました:`, characters[index]);
    } else {
        // 同名のキャラクターが存在しない場合は追加
        characters = [...characters, newCharacter];
        window.DebaglogSet?.(`キャラクター ${newCharacter.name} を追加しました:`, newCharacter);
    }
    return characters; // 更新された配列を返す
}

function toFiniteNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function clamp(value, min, max) {
    const num = toFiniteNumber(value);
    if (Number.isFinite(min) && num < min) return min;
    if (Number.isFinite(max) && num > max) return max;
    return num;
}

function getCharacterResourceSummary(character) {
    const stats = character?.stats || {};
    const baseStats = stats.baseStats || {};
    const levelStats = stats.levelStats || {};
    const itemStats = character?.itemBonuses?.stats || {};
    const skillBonuses = character?.skillBonuses || {};
    const damage = character?.damage || {};

    const sizBonus = calculateCorrection(
        Math.max(
            toFiniteNumber(baseStats.SIZ || 0),
            toFiniteNumber(levelStats.SIZ || 0)
        )
    );

    const hpMax = Math.max(1, parseInt((
        (toFiniteNumber(baseStats.HP) || 0)
        + (toFiniteNumber(levelStats.HP) || 0)
        + (toFiniteNumber(itemStats["HP+"]) || 0)
        + (toFiniteNumber(skillBonuses["HP"]) || 0)
    ) * (1 + sizBonus / 100), 10));
    const mpMax = Math.max(0, parseInt(
        (toFiniteNumber(baseStats.MP) || 0)
        + (toFiniteNumber(levelStats.MP) || 0)
        + (toFiniteNumber(itemStats["MP+"]) || 0)
        + (toFiniteNumber(skillBonuses["MP"]) || 0),
        10
    ));
    const stMax = Math.max(0, parseInt(
        (toFiniteNumber(baseStats.ST) || 0)
        + (toFiniteNumber(levelStats.ST) || 0)
        + (toFiniteNumber(itemStats["ST+"]) || 0)
        + (toFiniteNumber(skillBonuses["SP"]) || 0),
        10
    ));

    const hpConsumedPercent = clamp(toFiniteNumber(damage.HP_消費), 0, 100);
    const hpCurrent = Math.round(hpMax * (1 - hpConsumedPercent / 100));
    const mpCurrent = Math.round(clamp(mpMax - toFiniteNumber(damage.MP_消費), 0, mpMax));
    const stCurrent = Math.round(clamp(stMax - toFiniteNumber(damage.ST_消費), 0, stMax));

    return {
        hp: { current: hpCurrent, max: hpMax },
        mp: { current: mpCurrent, max: mpMax },
        st: { current: stCurrent, max: stMax }
    };
}

// キャラクターを表示する関数
async function displayCharacters(characters) {
    window.DebaglogSet?.('displayCharacters: 起動', characters);
    const characterList = document.getElementById('character-list');
    characterList.innerHTML = ''; // リストを初期化

    if (!characters || characters.length === 0) {
        characterList.textContent = 'キャラクター情報がありません。';
        return;
    }

    if (!Array.isArray(characters)) {
        characters = [characters];
    }

    const currentName = String(window.playerData?.name || '').trim();
    const hasCurrent = currentName && characters.some((character) => (
        String(character?.name || '').trim() === currentName
    ));
    const activeName = hasCurrent
        ? currentName
        : String(characters[0]?.name || '').trim();

    characters.forEach((character, index) => {
        const characterContainer = document.createElement('div');
        characterContainer.classList.add('character-container');
    
        // クリックイベントを設定
        characterContainer.onclick = async function() {
            window.DebaglogSet?.('Character container clicked');

            const wasSelected = characterContainer.classList.contains('selected');
            if (wasSelected) {
                if (typeof window.openResourceAdjustModalForCharacter === 'function') {
                    await window.openResourceAdjustModalForCharacter(character?.name || '', {
                        mode: 'value',
                        operation: 'decrease'
                    });
                }
                return;
            }

            // すべてのキャラクターコンテナから「selected」クラスを削除
            characterList.querySelectorAll('.character-container.selected').forEach((el) => {
                el.classList.remove('selected');
            });

            await characterDataDisplay(character);
            // クリックされたキャラクターコンテナに「selected」クラスを追加
            characterContainer.classList.add('selected');
        };

        window.DebaglogSet?.(" character : ", character)

        // キャラクター名、レベル、Efを表示
        const nameElem = document.createElement('p');
        nameElem.classList.add('character-name');
        nameElem.textContent = `${character.name}`; //名前: 
        const levelElem = document.createElement('p');
        levelElem.classList.add('character-meta');
        levelElem.textContent = `Lv: ${character.stats.allLv / 10} Ef: ${character.stats.allEf}`;

        const resources = getCharacterResourceSummary(character);

        // HP、MP、STバーを作成
        const hpBar = createStatusBar('HP', resources.hp.current, resources.hp.max);
        const mpBar = createStatusBar('MP', resources.mp.current, resources.mp.max);
        const stBar = createStatusBar('ST', resources.st.current, resources.st.max);

        // 各要素をキャラクターコンテナに追加
        characterContainer.appendChild(nameElem);
        characterContainer.appendChild(levelElem);
        characterContainer.appendChild(hpBar);
        characterContainer.appendChild(mpBar);
        characterContainer.appendChild(stBar);

        // キャラクターコンテナをリストに追加
        const rowName = String(character?.name || '').trim();
        if ((activeName && rowName === activeName) || (!activeName && index === 0)) {
            characterContainer.classList.add('selected');
        }
        characterList.appendChild(characterContainer);
    });
}

// ステータスバーを作成する関数
function createStatusBar(label, currentValue, maxValue) {
    const container = document.createElement('div');
    container.classList.add('status-bar');

    const labelElem = document.createElement('label');
    labelElem.textContent = `${label}`;

    const progressContainer = document.createElement('div');
    progressContainer.classList.add('progress-container');


    // currentValueとmaxValueを数値に変換
    const current = parseInt(currentValue, 10) || 0;
    const max = parseInt(maxValue, 10) || 1; // maxが0の場合を避けるためデフォルトで1を設定

    const progress = document.createElement('progress');
    progress.value = current;
    progress.max = max;
    progress.classList.add(`${label.toLowerCase()}-bar`);

    const valueText = document.createElement('span');
    valueText.classList.add('progress-value');
    valueText.textContent = `${current} / ${max}`;

    progressContainer.appendChild(progress);
    progressContainer.appendChild(valueText);

    container.appendChild(labelElem);
    container.appendChild(progressContainer);

    return container;
}

