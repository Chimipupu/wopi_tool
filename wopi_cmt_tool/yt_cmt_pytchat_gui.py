import tkinter as tk
from tkinter import filedialog, messagebox
import re
import json
from tkinter import ttk
from yt_dlp import YoutubeDL
import pytchat
import threading
import urllib.parse

# データを保持するためのグローバル変数
parsed_data = []

# YouTube URLのパース
def parse_yt_url(url):
    parsed_data = []
    # URLの解析
    parsed_url = urllib.parse.urlparse(url)

    # URL形式によって処理を分岐
    if 'youtu.be' in parsed_url.netloc:
        # 短縮URL形式 (https://youtu.be/{video_id})
        video_id = parsed_url.path.lstrip('/')  # pathの最初のスラッシュを削除してvideo_idを取得
        clean_url = f"https://www.youtube.com/watch?v={video_id}"
        return clean_url, video_id

    elif 'youtube.com' in parsed_url.netloc:
        # フルURL形式 (https://www.youtube.com/watch?v={video_id})
        query_params = urllib.parse.parse_qs(parsed_url.query)
        video_id = query_params.get('v')
        if video_id:
            clean_url = f"https://www.youtube.com/watch?v={video_id[0]}"
            return clean_url, video_id[0]
        else:
            messagebox.showerror("エラー", "YouTubeのURLを入力してください")
            raise ValueError("YouTubeのURLを入力してください")

    else:
        raise ValueError("無効なURL形式です")

def open_file():
    global parsed_data
    file_path = filedialog.askopenfilename(filetypes=[("All Files", "*.*")])
    if not file_path:
        return
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            parsed_data = parse_data(lines)
            display_data(parsed_data)
    except Exception as e:
        messagebox.showerror("Error", f"Could not open file: {e}")

# YouTubeコメントのJSON形式のパース処理（正規表現）
def parse_data(lines):
    parsed = []
    all_lines = "\n".join(lines)  # ファイル全体を文字列に変換

    # 動画へのコメントのJSON形式対応（動画ID.info.json）
    # 最初に全ての "parent": "root" のエントリを探す
    message_matches = re.findall(r'"parent": "root", "text":\s*"(.*?)"', all_lines)
    if message_matches:
        # メッセージが見つかったら、その後のauthorを探す
        author_matches = re.findall(r'"author":\s*"(@\w+)"', all_lines)

        # メッセージと著者を対応付けて処理
        for i, message in enumerate(message_matches):
            author = author_matches[i] if i < len(author_matches) else "Unknown"
            parsed.append((author, message, ""))  # ラベルは空として処理

    else:
        # 非ライブ動画形式が見つからなかった場合、行ごとに処理
        for line in lines:
            author = None
            messages = []
            label = ""

            # まずauthorNameを探す
            # 配信ライブチャットのJSON形式対応（動画ID_.live_chat.json）
            author_match = re.search(r'"authorName": {"simpleText": "(.*?)"}', line)
            if author_match:
                author = author_match.group(1)
                # 続けてmessageを探す
                message_match = re.search(r'"message": {"runs": \[(.*?)\]}', line)
                if message_match:
                    messages = re.findall(r'"text": "(.*?)"', message_match.group(1))

            # authorNameが見つからない場合はauthorを探す
            if not author:
                author_match = re.search(r'"author":\s*"(@\w+)"', line)
                if author_match:
                    author = author_match.group(1)
                    # 続けてtextを探す
                    message_match = re.search(r'"text":\s*"(.*?)"', line)
                    if message_match:
                        messages = [message_match.group(1)]

            # pytchatのJSON形式対応（yt_cmt_動画ID.json）
            # authorも見つからない場合はnameを探す
            if not author:
                author_match = re.search(r'"name":\s*"(.*?)"', line)
                if author_match:
                    author = author_match.group(1)
                    # 続けてmessageを探す
                    message_match = re.search(r'"message":\s*"(.*?)"', line)
                    if message_match:
                        messages = [message_match.group(1)]

            # ラベルを探す（任意）
            label_match = re.search(r'"label": "(.*?)"', line)
            if label_match:
                label = label_match.group(1)

            # 抽出結果があればparsedに追加
            if author and messages:
                for message in messages:
                    parsed.append((author, message, label))

    return parsed

def display_data(data):
    for row in tree.get_children():
        tree.delete(row)  # Clear previous content
    for author, message, label in data:
        tree.insert("", tk.END, values=(author, message, label))

def sort_data(order):
    global parsed_data
    if order == 'asc':
        sorted_data = sorted(parsed_data, key=lambda x: x[0])
    else:
        sorted_data = sorted(parsed_data, key=lambda x: x[0], reverse=True)
    display_data(sorted_data)

def save_to_json():
    global parsed_data
    file_path = filedialog.asksaveasfilename(defaultextension=".json",
                                               filetypes=[("JSON Files", "*.json")])
    if not file_path:
        return
    try:
        json_data = [{"author": author, "message": message, "label": label} for author, message, label in parsed_data]
        with open(file_path, 'w', encoding='utf-8') as file:
            json.dump(json_data, file, ensure_ascii=False, indent=4)
        messagebox.showinfo("Success", "Data successfully saved to JSON.")
    except Exception as e:
        messagebox.showerror("Error", f"Could not save to JSON: {e}")

# 検索機能の実装
def search_comments():
    global parsed_data
    search_term = search_entry.get().strip()
    if not search_term:
        messagebox.showerror("Error", "検索キーワードを入力してください。")
        return

    try:
        count = sum(search_term in message for _, message, _ in parsed_data)
        result_label.config(text=f"検索結果:'{search_term}'... {count}件")

        # 正規表現を使った検索
        if regex_var.get():
            filtered_data = [(author, message, label) for author, message, label in parsed_data if re.search(search_term, message)]
        # 通常の部分一致検索
        else:
            filtered_data = [(author, message, label) for author, message, label in parsed_data if search_term in message]

        display_data(filtered_data)
    except re.error:
        messagebox.showerror("Error", "正規表現が無効です。")

# pytchat関連(YouTubeライブ用)
def dl_cmt_pytchat(url):
    global parsed_data
    livechat = pytchat.create(video_id=url)
    def process_chat():
        clean_url, v_id = parse_yt_url(url)
        messagebox.showinfo("接続", "YouTubeライブ(" + clean_url + ")のコメントを取得します！")
        print(f"Clean URL: {clean_url}")
        print(f"Video ID: {v_id}")

        with open("yt_cmt_" + v_id + ".json", "a", encoding="utf-8") as f:
            while livechat.is_alive():
                chatdata = livechat.get()
                for c in chatdata.items:
                    json_data = c.json()
                    f.write(json_data + "\n")
                    author = c.author.name
                    message = c.message
                    label = ""  # ラベルがない場合
                    parsed_data.append((author, message, label))
                    root.after(0, lambda: tree.insert("", tk.END, values=(author, message, label)))
                    print("[" + author + "]:", message)
        messagebox.showinfo("終了", "YouTubeライブが終了しました")

    threading.Thread(target=process_chat, daemon=True).start()

def yt_cmt_dl_pytchat():
    url = url_entry.get()
    if not url:
        messagebox.showerror("Error", "URLを入力してください。")
        return
    try:
        dl_cmt_pytchat(url)
        # messagebox.showinfo("成功", "YouTubeライブが終了したのでコメントを保存しました！")
    except Exception as e:
        messagebox.showerror("Error", f"Could not download comments: {e}")



# yt-dlpで動画ダウンロード
def dl_yt(url):
    ydl_video_opts = {
        'outtmpl': '%(title)s' + '_.mp4',
        # 'format': 'best',
        # 'format': 'bestvideo+bestaudio/best',
        'format':'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]',
        'writeinfojson': True,
        'writesubtitles': True,
        'getcomments': True,
        'key': 'EmbedThumbnail',
        'already_have_thumbnail': True,
        'ignoreerrors':True,
    }
    def proc_chat_dl():
        with YoutubeDL(ydl_video_opts) as ydl:
            result = ydl.download([url])
        messagebox.showinfo("終了", "動画のダウンロード完了")

    threading.Thread(target=proc_chat_dl, daemon=True).start()

def yt_dl_ytdlp():
    url = url_entry.get()
    if not url:
        messagebox.showerror("Error", "URLを入力してください。")
        return
    try:
        messagebox.showinfo("接続", "YouTube動画をダウンロードします")
        dl_yt(url)
    except Exception as e:
        messagebox.showerror("Error", f"Could not download comments: {e}")

# yt-dlpでコメントダウンロード
def dl_cmt_yt(url):
    ydl_video_opts = {
        'outtmpl': '%(id)s' + '_.mp4',
        'format': 'best',
        'writeinfojson': True,
        'writesubtitles': True,
        'getcomments': True,
        'skip_download': True,
        'ignoreerrors':True,
        'getcomments':True,
        'noprogress': False
    }
    def proc_chat_dl():
        clean_url, v_id = parse_yt_url(url)
        print(f"Clean URL: {clean_url}")
        print(f"Video ID: {v_id}")
        with YoutubeDL(ydl_video_opts) as ydl:
            # result = ydl.download([url])
            result = ydl.download([clean_url])
        messagebox.showinfo("終了", "コメントのダウンロード完了")

    threading.Thread(target=proc_chat_dl, daemon=True).start()

def yt_cmt_dl_ytdlp():
    url = url_entry.get()
    if not url:
        messagebox.showerror("Error", "URLを入力してください。")
        return
    try:
        messagebox.showinfo("接続", "YouTubeからコメントをダウンロードします")
        dl_cmt_yt(url)
    except Exception as e:
        messagebox.showerror("Error", f"Could not download comments: {e}")

# GUIのセットアップ
root = tk.Tk()
root.geometry("800x760")

# YouTube URLの上にメッセージを表示
message_label = tk.Label(root, text="をぴの里♨ YouTubeコメントツール Ver0.2.2", bg='#e0c0ff', font=('Arial', 12, 'bold'))
message_label.pack(pady=5)

root.title("をぴの里♨YouTubeコメントツール Ver0.2.2")
root.configure(bg='#e0c0ff')  # 背景色を紫色に設定

# Treeviewの設定
frame = tk.Frame(root, bg='#e0c0ff')
frame.pack(pady=10, expand=True, fill=tk.BOTH)

columns = ("Author", "Message", "Label")
tree = ttk.Treeview(frame, columns=columns, show='headings', height=20)
tree.heading("Author", text="名前")
tree.heading("Message", text="コメント")
tree.heading("Label", text="ラベル")
tree.column("Author", width=200)
tree.column("Message", width=400)
tree.column("Label", width=150)
tree.pack(expand=True, fill=tk.BOTH)

# 検索結果表示用ラベル
result_label = tk.Label(root, text="", bg='#e0c0ff', font=('Arial', 12))
result_label.pack(pady=5)
# 検索キーワード入力
search_frame = tk.Frame(root, bg='#e0c0ff')
search_frame.pack(pady=10)
tk.Label(search_frame, text="検索キーワード:", bg='#e0c0ff', font=('Arial', 12)).pack(side=tk.LEFT)
search_entry = tk.Entry(search_frame, width=30, font=('Arial', 12))
search_entry.pack(side=tk.LEFT, padx=5)
regex_var = tk.BooleanVar()
regex_checkbox = tk.Checkbutton(search_frame, text="正規表現", variable=regex_var, bg='#e0c0ff', font=('Arial', 12))
regex_checkbox.pack(side=tk.LEFT)
save_button = tk.Button(search_frame, text="検索", command=search_comments, font=('Arial', 12), bg='#ffb3ff', fg='#4b0082')
save_button.pack(side=tk.LEFT, padx=5)

# ファイルを開くボタンと名前ボタン
button_top_frame = tk.Frame(root, bg='#e0c0ff')
button_top_frame.pack(pady=5)
open_button = tk.Button(button_top_frame, text="ファイルを開く", command=open_file, font=('Arial', 12), bg='#ffb3ff', fg='#4b0082')
open_button.pack(side=tk.LEFT, padx=5)
asc_button = tk.Button(button_top_frame, text="名前（昇順）", command=lambda: sort_data('asc'), font=('Arial', 12), bg='#ffb3ff', fg='#4b0082')
asc_button.pack(side=tk.LEFT, padx=5)
desc_button = tk.Button(button_top_frame, text="名前（降順）", command=lambda: sort_data('desc'), font=('Arial', 12), bg='#ffb3ff', fg='#4b0082')
desc_button.pack(side=tk.LEFT, padx=5)

# URL入力フィールド
url_frame = tk.Frame(root, bg='#e0c0ff')
url_frame.pack(pady=10)
tk.Label(url_frame, text="YouTube URL:", bg='#e0c0ff', font=('Arial', 12)).pack(side=tk.LEFT)
url_entry = tk.Entry(url_frame, width=50, font=('Arial', 12))
url_entry.pack(side=tk.LEFT)

# 残りのボタンフレーム
button_frame = tk.Frame(root, bg='#e0c0ff')
button_frame.pack(pady=10)

download_button = tk.Button(button_frame, text="配信チャット表示", command=yt_cmt_dl_pytchat, font=('Arial', 12), bg='#ffb3ff', fg='#4b0082')
download_button.pack(side=tk.LEFT, padx=5)

download_button = tk.Button(button_frame, text="動画ダウンロード", command=yt_dl_ytdlp, font=('Arial', 12), bg='#ffb3ff', fg='#4b0082')
download_button.pack(side=tk.LEFT, padx=5)

download_button = tk.Button(button_frame, text="動画コメントDL", command=yt_cmt_dl_ytdlp, font=('Arial', 12), bg='#ffb3ff', fg='#4b0082')
download_button.pack(side=tk.LEFT, padx=5)

# アプリケーション実行
root.mainloop()