let charactersData = []; 

const maxValues = {
    HP: 600,
    MP: 600,
    ST: 600,
    攻撁E 600,
    防御: 600,
    魔力: 600,
    魔防: 600,
    速度: 600,
    命中: 600,
    SIZ: 1000,
    APP: 500,
    合計値: 4700,
};

let selectedCharacter = null; // 選択されたキャラクターを保持
let selectedCharacterData = null


// ログイン処琁E
document.getElementById('login-button').addEventListener('click', async function () {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            displayCharacterNames(data.characters); // キャラクター名を表示
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('main-container').style.display = 'flex';
        } else {
            const errorData = await response.json();
            document.getElementById('error-message').textContent = errorData.message;
            document.getElementById('error-message').style.display = 'block';
        }
    } else {
        alert('ユーザー名とパスワードを入力してください、E);
    }
});

// // キャラクター名�Eリストを表示
// function displayCharacterNames(characters) {
//     const characterList = document.getElementById('character-list');
//     characterList.innerHTML = '';

//     characters.forEach(character => {
//         const li = document.createElement('li');
//         li.textContent = character.名前;

//         // キャラクターを選抁E
//         li.addEventListener('click', () => {
//             selectedCharacter = character.名前;
//             document.getElementById('start-story-button').disabled = false; // ボタンを有効匁E
//             highlightSelectedCharacter(li);
//             displayCharacterStats(character); // キャラクターのスチE�Eタスを表示
//         });

//         characterList.appendChild(li);
//     });
// }
let selectedCharacters = []; // 選択されたキャラクターを保持

// キャラクター名とチェチE��ボックスを表示
function displayCharacterNames(characters) {
    const characterList = document.getElementById('character-list');
    characterList.innerHTML = '';

    characters.forEach(character => {
        const li = document.createElement('li');

        // チェチE��ボックスを作�E
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedCharacters.push(character);
            } else {
                selectedCharacters = selectedCharacters.filter(
                    selected => selected !== character
                );
            }
            updateStartButtonState(); // ボタンの有効化状態を更新
        });

        // キャラクター名を表示
        const label = document.createElement('span');
        label.textContent = character.名前;

        li.appendChild(checkbox);
        li.appendChild(label);
        characterList.appendChild(li);
    });
}
// スト�Eリーボタンの有効化状態を更新
function updateStartButtonState() {
    const startButton = document.getElementById('start-story-button');
    startButton.disabled = selectedCharacters.length === 0; // キャラクターぁEつ以上選択されてぁE��場合に有効匁E
}


// 選択したキャラクターのハイライト表示
function highlightSelectedCharacter(selectedElement) {
    const characterItems = document.querySelectorAll('#character-list li');
    characterItems.forEach(item => item.classList.remove('selected'));
    selectedElement.classList.add('selected');
}

// キャラクタースチE�Eタスを表示
function displayCharacterStats(stats) {
    const characterStats = document.getElementById('character-stats');
    characterStats.innerHTML = '';

    const textFields = ['名前', '二つ吁E, 'Lv', 'Ef'];
    textFields.forEach(field => {
        const row = document.createElement('tr');
        const labelCell = document.createElement('td');
        const valueCell = document.createElement('td');
        labelCell.textContent = field;
        valueCell.textContent = stats[field] || '';
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        characterStats.appendChild(row);
    });

    const filteredStats = Object.keys(stats).filter(key => 
        key !== 'APP' && key !== 'SIZ' && key !== '合計値' && !textFields.includes(key)
    );
    const statValues = filteredStats.map(stat => ({
        label: stat,
        value: parseFloat(stats[stat]) || 0,
    }));

    const values = statValues.map(stat => stat.value);
    const maxStatValue = Math.max(...values);
    const minStatValue = Math.min(...values);
    const secondHighestValue = values
        .filter(value => value < maxStatValue)
        .sort((a, b) => b - a)[0];

    statValues.forEach(stat => {
        const row = document.createElement('tr');
        const labelCell = document.createElement('td');
        const valueCell = document.createElement('td');

        labelCell.textContent = stat.label;
        valueCell.textContent = stat.value;

        if (stat.value === maxStatValue) {
            valueCell.classList.add('stat-highest');
        } else if (stat.value === secondHighestValue) {
            valueCell.classList.add('stat-second-highest');
        } else if (stat.value === minStatValue) {
            valueCell.classList.add('stat-lowest');
        }

        row.appendChild(labelCell);
        row.appendChild(valueCell);
        characterStats.appendChild(row);
    });

    ['APP', 'SIZ', '合計値'].forEach(label => {
        const row = document.createElement('tr');
        const labelCell = document.createElement('td');
        const valueCell = document.createElement('td');

        labelCell.textContent = label;
        valueCell.textContent = stats[label] || 0;

        row.appendChild(labelCell);
        row.appendChild(valueCell);
        characterStats.appendChild(row);
    });
}

// キャラクターチE�Eタを取得する非同期関数
async function fetchCharacterData(characterName) {
    const response = await fetch(`/api/character?name=${characterName}`);
    const result = await response.json();
    return result.data; // チE�Eタを返す
}

// スト�EリーボタンをクリチE��した時�E処琁E
async function startStoryButton() {
    // const selectedCharacterData = await fetchCharacterData(selectedCharacter); // キャラチE�Eタを取得して代入
    // 変更 名前のリストだけでぁE�� // selectedCharacterData ,
    window.DebaglogSet?.("スト�EリーボタンをクリチE��した時�E処琁E:", selectedCharacters);

    // sessionStorageにチE�Eタを保孁E
    // sessionStorage.setItem('selectedCharacter', JSON.stringify(selectedCharacterData));
    sessionStorage.setItem('selectedCharacter', JSON.stringify(selectedCharacters));

    window.location.href = 'story.html';
    window.DebaglogSet?.("ペ�Eジ移勁E:", window.location.href);
}

// ボタンにクリチE��イベントを追加
document.getElementById('start-story-button').addEventListener('click', () => {
    if (selectedCharacter) {
        startStoryButton();
    }
});


