const maxValues = {
    HP: 600,
    MP: 600,
    ST: 600,
    攻撃: 600,
    防御: 600,
    魔力: 600,
    魔防: 600,
    速度: 600,
    命中: 600,
    SIZ: 1000,
    APP: 500,
    合計値: 4700,
};

let selectedCharacters = [];

const loginButton = document.getElementById("login-button");
const startStoryButtonElement = document.getElementById("start-story-button");

loginButton?.addEventListener("click", async () => {
    const username = document.getElementById("username")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();
    const errorMessage = document.getElementById("error-message");

    if (!username || !password) {
        if (errorMessage) {
            errorMessage.textContent = "ユーザー名とパスワードを入力してください。";
            errorMessage.style.display = "block";
        }
        return;
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();

        if (!response.ok) {
            if (errorMessage) {
                errorMessage.textContent = data?.message || "ログインに失敗しました。";
                errorMessage.style.display = "block";
            }
            return;
        }

        sessionStorage.setItem("playerId", username);
        sessionStorage.setItem("username", username);

        const loginCharacters = Array.isArray(data?.characters) ? data.characters : [];
        const playerCharacterList = loginCharacters
            .map((character) => (character?.名前 || character?.name || "").toString().trim())
            .filter((name, index, list) => name && list.indexOf(name) === index);

        sessionStorage.setItem("playerCharacterList", JSON.stringify(playerCharacterList));
        localStorage.setItem("playerCharacterList", JSON.stringify(playerCharacterList));

        displayCharacterNames(loginCharacters);
        const loginContainer = document.getElementById("login-container");
        const mainContainer = document.getElementById("main-container");
        if (loginContainer) loginContainer.style.display = "none";
        if (mainContainer) mainContainer.style.display = "flex";
        if (errorMessage) errorMessage.style.display = "none";
    } catch (error) {
        if (errorMessage) {
            errorMessage.textContent = "通信エラーが発生しました。";
            errorMessage.style.display = "block";
        }
    }
});

function displayCharacterNames(characters) {
    const characterList = document.getElementById("character-list");
    if (!characterList) return;

    characterList.innerHTML = "";
    selectedCharacters = [];
    updateStartButtonState();

    characters.forEach((character) => {
        const li = document.createElement("li");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        const label = document.createElement("span");
        label.textContent = character?.名前 || character?.name || "不明";

        const syncSelectedState = () => {
            if (checkbox.checked) {
                if (!selectedCharacters.includes(character)) {
                    selectedCharacters.push(character);
                }
                li.classList.add("selected");
                displayCharacterStats(character);
            } else {
                selectedCharacters = selectedCharacters.filter((c) => c !== character);
                li.classList.remove("selected");
            }
            updateStartButtonState();
        };

        checkbox.addEventListener("change", syncSelectedState);
        label.addEventListener("click", () => {
            checkbox.checked = !checkbox.checked;
            syncSelectedState();
        });

        li.appendChild(checkbox);
        li.appendChild(label);
        characterList.appendChild(li);
    });
}

function updateStartButtonState() {
    if (!startStoryButtonElement) return;
    startStoryButtonElement.disabled = selectedCharacters.length === 0;
}

function displayCharacterStats(stats) {
    const characterStats = document.getElementById("character-stats");
    if (!characterStats || !stats || typeof stats !== "object") return;
    characterStats.innerHTML = "";

    const textFields = ["名前", "二つ名", "Lv", "Ef"];
    textFields.forEach((field) => {
        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        const valueCell = document.createElement("td");
        labelCell.textContent = field;
        valueCell.textContent = stats[field] ?? "";
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        characterStats.appendChild(row);
    });

    const hidden = new Set(["APP", "SIZ", "合計値", ...textFields]);
    const numericStats = Object.keys(stats)
        .filter((key) => !hidden.has(key))
        .map((key) => ({ key, value: Number(stats[key]) }))
        .filter((entry) => Number.isFinite(entry.value));

    if (numericStats.length > 0) {
        const values = numericStats.map((s) => s.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const secondHighest = values.filter((v) => v < maxValue).sort((a, b) => b - a)[0];

        numericStats.forEach((entry) => {
            const row = document.createElement("tr");
            const labelCell = document.createElement("td");
            const valueCell = document.createElement("td");
            labelCell.textContent = entry.key;
            valueCell.textContent = String(entry.value);

            if (entry.value === maxValue) valueCell.classList.add("stat-highest");
            else if (entry.value === secondHighest) valueCell.classList.add("stat-second-highest");
            else if (entry.value === minValue) valueCell.classList.add("stat-lowest");

            row.appendChild(labelCell);
            row.appendChild(valueCell);
            characterStats.appendChild(row);
        });
    }

    ["APP", "SIZ", "合計値"].forEach((key) => {
        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        const valueCell = document.createElement("td");
        labelCell.textContent = key;
        valueCell.textContent = String(stats[key] ?? 0);
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        characterStats.appendChild(row);
    });
}

async function startStoryButton() {
    sessionStorage.setItem("selectedCharacters", JSON.stringify(selectedCharacters));
    sessionStorage.setItem("selectedCharacter", JSON.stringify(selectedCharacters));
    window.location.href = "story.html";
}

startStoryButtonElement?.addEventListener("click", () => {
    if (selectedCharacters.length > 0) {
        startStoryButton();
    }
});
