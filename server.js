
// // サーバーを起動
// // app.listen(PORT, () => {
// //     console.log(`Server is running on http://localhost:${PORT}`);
// // });
// app.listen(3000, '0.0.0.0', () => {
//     console.log(`Server is running on http://localhost:3000`);
// });

const express = require('express');
const fs = require('fs');
const path = require('path');
const apiRoutes = require('./routes/api');
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// 静的ファイルの提供設定
// dist があれば優先し、未出力アセット(app.js 等)は public へフォールバックする。
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

function resolveHtmlPath(fileName) {
    const distPath = path.join(distDir, fileName);
    if (fs.existsSync(distPath)) return distPath;
    return path.join(publicDir, fileName);
}

app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(resolveHtmlPath('index.html'));
});

app.get('/story.html', (req, res) => {
    res.sendFile(resolveHtmlPath('story.html'));
});

app.get('/load.html', (req, res) => {
    res.sendFile(resolveHtmlPath('load.html'));
});

app.get('/favicon.ico', (req, res) => {
    const candidates = [
        path.join(distDir, 'favicon.ico'),
        path.join(publicDir, 'favicon.ico')
    ];
    const found = candidates.find((filePath) => fs.existsSync(filePath));
    if (found) {
        res.sendFile(found);
        return;
    }
    res.status(204).end();
});

if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
}
app.use(express.static(publicDir));

// APIルーティング
app.use('/api', apiRoutes);

// サーバーを起動
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
