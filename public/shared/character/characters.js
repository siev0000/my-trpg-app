const express = require('express');
const router = express.Router();
const Datastore = require('nedb');
const path = require('path');
const authenticateUser = require('../middleware/auth'); // 認証ミドルウェア

// データベース設定
const characterDB = new Datastore({ filename: path.join(__dirname, '../data/db/characters.db'), autoload: true });

// キャラクターの追加
router.post('/', authenticateUser, (req, res) => {
    const userId = req.user._id; // 認証済みユーザーのID
    const newCharacter = { ...req.body, userId }; // ユーザーIDを追加

    characterDB.insert(newCharacter, (err, newDoc) => {
        if (err) {
            console.error('キャラクター追加エラー:', err);
            return res.status(500).json({ error: 'キャラクターの作成に失敗しました' });
        }
        res.status(201).json(newDoc);
    });
});

// キャラクター一覧の取得
router.get('/', authenticateUser, (req, res) => {
    const userId = req.user._id; // 認証済みユーザーのID

    // データベースからユーザーのキャラクターを取得
    characterDB.find({ userId }, (err, docs) => {
        if (err) {
            console.error('キャラクターデータ取得エラー:', err);
            return res.status(500).json({ error: 'キャラクターデータの取得に失敗しました' });
        }
        res.status(200).json(docs); // ユーザーのキャラクターを返す
    });
});

// データを全件取得するエンドポイント
router.get('/all', (req, res) => {
    characterDB.find({}, (err, characters) => { // 条件を空オブジェクト `{}` にすることで全件取得
        if (err) {
            console.error('データ取得エラー:', err);
            return res.status(500).json({ error: 'データ取得に失敗しました' });
        }

        console.log('取得データ:', characters); // 全件をログに記録
        res.status(200).json(characters); // 全件データをクライアントに返す
    });
});

// キャラクターの取得
router.get('/:id', authenticateUser, (req, res) => {
    const userId = req.user._id; // 認証済みユーザーのID（認証ミドルウェアで設定）
    const characterId = req.params.id; // URLパラメータからキャラクターIDを取得

    // console.log('検索条件:', { _id: characterId, userId }); // デバッグ用ログ

    // キャラクターを検索
    characterDB.findOne({ _id: characterId, userId }, (err, foundDoc) => {
        if (err) {
            console.error('キャラクター取得エラー:', err);
            return res.status(500).json({ error: 'キャラクターの取得に失敗しました' });
        }

        if (!foundDoc) {
            console.warn('一致するキャラクターが見つかりません');
            return res.status(404).json({ error: '一致するキャラクターが見つかりません' });
        }
        console.log('取得したキャラクター:', foundDoc.party); // ログに記録
        // console.log('取得したキャラクター:', foundDoc.name, foundDoc.userId, "Lv:", foundDoc.stats.allLv, "Ef:", foundDoc.stats.allEf); // ログに記録
        res.status(200).json(foundDoc); // 取得したキャラクター情報を返す
    });
});


const Joi = require('joi');

// 更新時のバリデーションスキーマ
const updateCharacterSchema = Joi.object({
    name: Joi.string().max(100),
    stats: Joi.object({
        hp: Joi.number().min(0),
        mp: Joi.number().min(0),
        strength: Joi.number().min(0),
    }).optional(),
    inventory: Joi.array().items(Joi.object({
        name: Joi.string(),
        quantity: Joi.number().min(0),
    })).optional(),
});


// const userId = req.body.userId; // 認証済みユーザーのID
// const characterId = req.body._id; // 更新対象のキャラクターID

// キャラクターの更新
router.put('/:id', authenticateUser, (req, res) => {
    const userId = req.body.userId; // 認証済みユーザーのID
    const characterId = req.body._id; // 更新対象のキャラクターID
    const updatedData = req.body; // クライアントから送信された更新データ

    console.log('検索条件:', { _id: characterId, userId }); // デバッグ用
    console.log('更新クエストデータ:', updatedData.questProgress ); // デバッグ用
    console.log('更新データ:', updatedData ); // デバッグ用

    // 検索してログを表示
    characterDB.findOne({ _id: characterId, userId }, (findErr, foundDoc) => {
        if (findErr) {
            console.error('データ検索エラー:', findErr);
            return res.status(500).json({ error: 'データ検索に失敗しました' });
        }
        if (!foundDoc) {
            console.warn('一致するデータが見つかりません');
            return res.status(404).json({ error: '一致するキャラクターが見つかりません' });
        }

        console.log('検索結果:', foundDoc.userId, foundDoc._id, foundDoc.name, foundDoc.userId.equipmentSlot); // 検索結果をログに記録
        
        // データの更新
        characterDB.update(
            { _id: characterId, userId }, // 検索条件
            { $set: updatedData }, // 更新内容
            { multi: false, upsert: false }, // upsertを無効化
            (err, numAffected) => {
                if (err) {
                    console.error('キャラクター更新エラー:', err);
                    return res.status(500).json({ error: 'キャラクターの更新に失敗しました' });
                }

                console.log('更新件数:', numAffected); // 更新件数をログに記録

                // 更新後のデータを取得
                characterDB.findOne({ _id: characterId, userId }, (postFindErr, updatedDoc) => {
                    if (postFindErr) {
                        console.error('更新後のデータ取得エラー:', postFindErr);
                        return res.status(500).json({ error: '更新後のデータ取得に失敗しました' });
                    }
                    console.log('更新後のデータ:', updatedDoc.name, updatedDoc.userId, updatedDoc.equipmentSlot); // 更新後のデータをログに記録
                    res.status(200).json(updatedDoc); // 更新後のデータを返す
                });
            }
        );
    });
});







module.exports = router;
