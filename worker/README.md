# null-access-log

名刺ページへのアクセス (時刻 / IP / ジオIP による場所 / UA / referrer) を記録する Cloudflare Worker。
Cloudflare が付与する `request.cf` から国・地域・都市・緯度経度を取るので外部の GeoIP API は不要。

## デプロイ

```sh
cd worker
wrangler kv namespace create LOGS        # 出力された id を wrangler.toml に書く
wrangler secret put VIEW_KEY             # 一覧を見るときの合言葉
wrangler deploy                          # https://null-access-log.<account>.workers.dev
```

デプロイ後、`index.html` の `ACCESS_LOG_ENDPOINT` に Worker の URL を入れる。

## 見る

```
https://null-access-log.<account>.workers.dev/?key=<VIEW_KEY>&format=html
https://null-access-log.<account>.workers.dev/?key=<VIEW_KEY>&limit=50   # JSON
```

## 注意

- 訪問者の IP と推定位置を保存するので、必要なら削除ポリシーを決めること (KV の値に TTL を付けるなら `env.LOGS.put(key, v, { expirationTtl: 60*60*24*90 })`)。
- referrer が空のアクセスはカメラアプリからの QR 読み取りであることが多い。
