// キャラクターを追加また�E更新する関数 帰ってきたチE�EタでダメージめE��用スキルを更新できるようにした
function addOrUpdateCharacter(characters, newCharacter) {
    // charactersが�E列でなぁE��合�E初期匁E
    if (!Array.isArray(characters)) {
        characters = [];
    }
    window.DebaglogSet?.(`キャラクターを追加また�E更新する関数 ${characters} `, newCharacter);
    // 同名のキャラクターを探ぁE
    const index = characters.findIndex(char => char.name === newCharacter.name);

    if (index !== -1) {
        // 同名のキャラクターが存在する場合�E更新
        characters[index] = { ...characters[index], ...newCharacter };
        window.DebaglogSet?.(`キャラクター ${newCharacter.name} を更新しました:`, characters[index]);
    } else {
        // 同名のキャラクターが存在しなぁE��合�E追加
        characters = [...characters, newCharacter];
        window.DebaglogSet?.(`キャラクター ${newCharacter.name} を追加しました:`, newCharacter);
    }
    return characters; // 更新された�E列を返す
}


// キャラクターを表示する関数
async function displayCharacters(characters) {
    window.DebaglogSet?.('displayCharacters: �N��', characters);
    const characterList = document.getElementById('character-list');
    characterList.innerHTML = ''; // リストを初期匁E

    if (!characters || characters.length === 0) {
        characterList.textContent = '�L�����N�^�[��񂪂���܂���B';
        return;
    }

    if (!Array.isArray(characters)) {
        characters = [characters];
    }

    characters.forEach(character => {
        const characterContainer = document.createElement('div');
        characterContainer.classList.add('character-container');
    
        // クリチE��イベントを設宁E
        characterContainer.onclick = function() {
            window.DebaglogSet?.('Character container clicked');
    
            // すべてのキャラクターコンチE��から「selected」クラスを削除
            characterList.querySelectorAll('.character-container.selected').forEach(el => {
                el.classList.remove('selected');
            });

            characterDataDisplay(character)
            // クリチE��されたキャラクターコンチE��に「selected」クラスを追加
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

        const sizBonus = calculateCorrection(
            Math.max(
                (character.stats.baseStats.SIZ || "0"),
                (character.stats.levelStats.SIZ || "0")
            )
        );

        window.DebaglogSet?.(" キャラクターを表示する関数 : ",sizBonus, character.stats.baseStats, character.stats.levelStats, character.itemBonuses.stats)
        // スチE�Eタス計箁E
        const hp = parseInt(((parseInt(character.stats.baseStats.HP) || 0) + 
                   (parseInt(character.stats.levelStats.HP) || 0) + 
                   (parseInt(character.itemBonuses.stats["HP+"]) || 0)+ 
                   (parseInt(character.skillBonuses["HP"]) || 0)) * ( 1 + sizBonus/100) , 10);
        const mp = (parseInt(character.stats.baseStats.MP) || 0) + 
                   (parseInt(character.stats.levelStats.MP) || 0) + 
                   (parseInt(character.itemBonuses.stats["MP+"]) || 0)+ 
                   (parseInt(character.skillBonuses["MP"]) || 0);
        const st = (parseInt(character.stats.baseStats.ST) || 0) + 
                   (parseInt(character.stats.levelStats.ST) || 0) + 
                   (parseInt(character.itemBonuses.stats["ST+"]) || 0)+ 
                   (parseInt(character.skillBonuses["SP"]) || 0);

        window.DebaglogSet?.(hp, mp, st);

        // HP、MP、STバ�Eを作�E
        const hpBar = createStatusBar('HP', hp * (1 - parseInt(character.damage.HP_消費 || 0) / 100), hp);
        const mpBar = createStatusBar('MP', mp - parseInt(character.damage.MP_消費 || 0), mp);
        const stBar = createStatusBar('ST', st - parseInt(character.damage.ST_消費 || 0), st);

        // 吁E��素をキャラクターコンチE��に追加
        characterContainer.appendChild(nameElem);
        characterContainer.appendChild(levelElem);
        characterContainer.appendChild(hpBar);
        characterContainer.appendChild(mpBar);
        characterContainer.appendChild(stBar);

        // キャラクターコンチE��をリストに追加
        characterList.appendChild(characterContainer);
    });
}

// スチE�Eタスバ�Eを作�Eする関数
function createStatusBar(label, currentValue, maxValue) {
    const container = document.createElement('div');
    container.classList.add('status-bar');

    const labelElem = document.createElement('label');
    labelElem.textContent = `${label}:`;

    const progressContainer = document.createElement('div');
    progressContainer.classList.add('progress-container');


    // currentValueとmaxValueを数値に変換
    const current = parseInt(currentValue, 10) || 0;
    const max = parseInt(maxValue, 10) || 1; // maxぁEの場合を避けるためチE��ォルトで1を設宁E

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


