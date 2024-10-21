import pytchat
import time
import json

videoUrl = "EDZpnIhKrtY"
filedir = "data/yt/"
livechat = pytchat.create(video_id = videoUrl)

# 保存用のファイルを開く（追記モード）
with open(filedir + "yt_cmt_" + videoUrl + ".json", "a", encoding="utf-8") as f:
    while livechat.is_alive():
        # チャットデータの取得
        chatdata = livechat.get()
        for c in chatdata.items:
            # チャットデータの表示
            print(f"{c.datetime} [{c.author.name}] {c.message} {c.amountString}")

            # チャットデータをJSON形式で保存
            json_data = c.json()  # JSON形式の文字列を取得
            f.write(json_data + "\n")  # 各メッセージを1行ごとに保存

        # 処理の間隔を指定
        # time.sleep(1)
