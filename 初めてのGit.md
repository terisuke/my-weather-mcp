Git 初心者向け：リポジトリにプッシュするまでの完全ガイド

対象
	•	Git をはじめてインストールしたばかりの人
	•	GitHub（または同等のホスティングサービス）にコードをアップロードしたい人

⸻

1. 事前準備

項目	やること	例／コマンド
Git のインストール	macOS: brew install gitWindows: 公式インストーラ	git --version で確認
GitHub アカウント	github.com で無料登録	ユーザー名とメールをメモ



⸻

2. Git の初期設定（最初の 1 回だけ）

# 自分の名前とメール（GitHub と同じにすると楽）
git config --global user.name  "山田 太郎"
git config --global user.email "taro@example.com"

# デフォルトブランチ名を main に統一（推奨）
git config --global init.defaultBranch main

🔍 ~/.gitconfig に保存されるので、一度設定すれば OK。

⸻

3. 新しいリポジトリを作る

A. GitHub 側で空のリポジトリを作成
	1.	GitHub 右上 「＋」→ New repository
	2.	Repository name を入力（例: my-first-repo）
	3.	「Initialize this repository with…」は 何もチェックしない ➜ Create repository

すると HTTPS URL と SSH URL が表示される。

今回は HTTPS を例に進めます（SSH キー設定は後述）。

B. ローカルでプロジェクトを用意

# まだプロジェクトフォルダがない場合
mkdir my-first-repo && cd $_

# 例として README を作成
echo "# My First Repo" > README.md



⸻

4. Git を使って履歴を作る

# ① Git 管理開始
git init          # カレントディレクトリに .git ができる

# ② 変更をステージに追加
git add README.md # ファイル指定（複数なら git add .）

# ③ スナップショットを作成（コミット）
git commit -m "初回コミット: README 追加"

💡 ステージ → コミット の 2 段階で履歴が作成される、という流れを覚えましょう。

⸻

5. GitHub とつなぐ（リモート設定）

# GitHub で表示されていた HTTPS URL を貼り付け
git remote add origin https://github.com/<ユーザー名>/my-first-repo.git

確認：

git remote -v
# origin  https://github.com/<ユーザー名>/my-first-repo.git (fetch & push)



⸻

6. プッシュ（＝クラウドへアップロード）

git push -u origin main

	•	初回は GitHub のユーザー名と PAT (Personal Access Token) またはパスワードを求められます
	•	2021 年以降、パスワード認証は廃止 → 必ず PAT を発行（GitHub → Settings → Developer settings → Tokens）
	•	-u は「以降このブランチを origin/main と追跡する」フラグ。次回以降は git push だけで OK。

⸻

7. 以降の基本ワークフロー
	1.	編集：コードやドキュメントを変更
	2.	ステージ：git add <ファイル>（全部なら git add .）
	3.	コミット：git commit -m "変更内容"
	4.	プッシュ：git push（初回以外はオプション不要）

⸻

8. よくあるハマりポイント

症状	原因と対策
fatal: repository not found	URL ミス or リポジトリが非公開 → URL 再確認／アクセス権を付与
認証エラー	PAT 未設定／期限切れ → 新しいトークンを発行して git credential を更新
main → main (fetch first)	リモートのほうが進んでいる → git pull --rebase origin main で最新を取り込む



⸻

9. SSH 認証を使いたい場合（おまけ）

# 1. 鍵生成（まだ無い場合）
ssh-keygen -t ed25519 -C "taro@example.com"

# 2. 公開鍵をコピー
cat ~/.ssh/id_ed25519.pub

# 3. GitHub → Settings → SSH and GPG keys → New SSH key に貼り付け
# 4. リモート URL を SSH に変更
git remote set-url origin git@github.com:<ユーザー名>/my-first-repo.git

以後はトークン入力なしでプッシュできます。

⸻

10. まとめ
	1.	初期設定：git config で名前・メール・デフォルトブランチ
	2.	リポジトリ準備：GitHub で空リポジトリ→ URL をコピー
	3.	ローカル作業：git init → add → commit
	4.	リモート設定：git remote add origin <URL>
	5.	プッシュ：git push -u origin main

この 5 ステップさえ押さえれば、Git 初心者でも迷わずクラウドへコードを共有できます。
Happy Git-ing! 🎉