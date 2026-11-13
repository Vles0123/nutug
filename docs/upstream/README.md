# 上游交付归档

本目录保存 v124 与 v127 两次 ZIP 快照交付的说明、文件清单和校验值，仅用于回溯。**当前开发直接在仓库根目录进行**，步骤见[项目 README](../../README.md)；归档文档中"先解压 ZIP 再进入 `source/`"的说明只适用于当时的交付方式。

归档文档保持交付时的原样，其哈希记录在各版本的 `SHA256SUMS` 文件中，请勿修改。

## 源码压缩包

压缩包体积较大（各约 9.6 MB），不再随仓库提交。需要时从提交 `8f37cec` 取回，并用校验值核对：

| 版本 | 原路径                                     | SHA-256                                                            |
| ---- | ------------------------------------------ | ------------------------------------------------------------------ |
| v127 | `nutug-v127-source.zip`                    | `01df4c2ee5fae59ac9518d286e3e9f3ee3589dfee671c0492e4e8316f09d1e96` |
| v124 | `docs/upstream/v124/nutug-v124-source.zip` | `b92ff5964e70a1b673398384f1e98f20b0dc3b75b4c13abf9a7a6dfd7d213a12` |

```sh
git show 8f37cec:nutug-v127-source.zip > nutug-v127-source.zip
git show 8f37cec:docs/upstream/v124/nutug-v124-source.zip > nutug-v124-source.zip
sha256sum nutug-v127-source.zip nutug-v124-source.zip
```

v127 的 `nutug-v127-manifest.json` 和 `nutug-v127-SHA256SUMS.txt` 原位于仓库根目录，现与其余交付文档一起放在 `v127/`。
