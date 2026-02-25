
// // サーバーを起動
// // app.listen(PORT, () => {
// //     console.log(`Server is running on http://localhost:${PORT}`);
// // });
// app.listen(3000, '0.0.0.0', () => {
//     console.log(`Server is running on http://localhost:3000`);
// });

const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// 静的ファイルの提供設定
app.use(express.static(path.join(__dirname, 'public'))); // publicフォルダを静的ファイルのルートに設定

// APIルーティング
app.use('/api', apiRoutes);

// サーバーを起動
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
