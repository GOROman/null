// 名刺ページのロジック本体 (リンク先 URL / 隠し要素の判定 / メッセージ文言)
// をここに閉じ込め、HTML/JS 側には data-url のような平文を残さない。
#include <emscripten/emscripten.h>
#include <string>

extern "C" {

// idx: 0=X, 1=LinkedIn, 2=Facebook, 3=このページ自身
EMSCRIPTEN_KEEPALIVE
const char* get_link_url(int idx) {
    static const char* urls[] = {
        "https://x.com/GOROman",
        "https://www.linkedin.com/in/goroman",
        "https://www.facebook.com/yoshihito.kondoh",
        "https://goroman.github.io/null/"
    };
    if (idx < 0 || idx > 3) return "";
    return urls[idx];
}

EMSCRIPTEN_KEEPALIVE
const char* get_link_label(int idx) {
    static const char* labels[] = { "@GOROman", "goroman", "yoshihito.kondoh", "goroman.github.io/null/" };
    if (idx < 0 || idx > 3) return "";
    return labels[idx];
}

EMSCRIPTEN_KEEPALIVE
const char* get_link_name(int idx) {
    static const char* names[] = { "@GOROman", "LinkedIn", "Facebook", "" };
    if (idx < 0 || idx > 3) return "";
    return names[idx];
}

EMSCRIPTEN_KEEPALIVE
const char* get_qr_asset(int idx) {
    static const char* assets[] = {
        "assets/qr-x.png",
        "assets/qr-linkedin.png",
        "assets/qr-facebook.png",
        "assets/qr.png?v=2"
    };
    if (idx < 0 || idx > 3) return "";
    return assets[idx];
}

// ---- 職業ループ ----
static int job_idx = 0;
static const char* jobs[] = { "無職", "エンジニア(自称)", "世界のGOROman", "休養中" };
static const int JOB_COUNT = 4;

EMSCRIPTEN_KEEPALIVE
const char* current_job_title() {
    return jobs[job_idx];
}

EMSCRIPTEN_KEEPALIVE
const char* next_job_title() {
    job_idx = (job_idx + 1) % JOB_COUNT;
    return jobs[job_idx];
}

// ---- コナミコマンド判定 (KeyboardEvent.keyCode を渡す) ----
static int konami_idx = 0;
static const int KONAMI[] = { 38, 38, 40, 40, 37, 39, 37, 39, 66, 65 };
static const int KONAMI_LEN = 10;

EMSCRIPTEN_KEEPALIVE
int check_konami(int keyCode) {
    if (keyCode == KONAMI[konami_idx]) {
        konami_idx++;
        if (konami_idx == KONAMI_LEN) {
            konami_idx = 0;
            return 1;
        }
        return 0;
    }
    konami_idx = (keyCode == KONAMI[0]) ? 1 : 0;
    return 0;
}

// ---- 合言葉判定 (1文字ずつ渡す) ----
static std::string secret_buffer;

EMSCRIPTEN_KEEPALIVE
int check_secret_word(const char* ch) {
    secret_buffer += ch;
    if (secret_buffer.size() > 20) {
        secret_buffer = secret_buffer.substr(secret_buffer.size() - 20);
    }
    if (secret_buffer.find("gorogoro") != std::string::npos) {
        secret_buffer.clear();
        return 1;
    }
    return 0;
}

// ---- 演出メッセージ ----
EMSCRIPTEN_KEEPALIVE
const char* msg_context_menu() { return "コピーはできないよ\xF0\x9F\x99\x8A"; }

EMSCRIPTEN_KEEPALIVE
const char* msg_caught() { return "掴まえた! \xF0\x9F\x96\x90\xEF\xB8\x8F"; }

EMSCRIPTEN_KEEPALIVE
const char* msg_secret_word() { return "ゴロゴロ...\xF0\x9F\x90\xBE"; }

EMSCRIPTEN_KEEPALIVE
const char* msg_party() { return "\xF0\x9F\x8E\x89 GOROman MODE \xF0\x9F\x8E\x89"; }

EMSCRIPTEN_KEEPALIVE
const char* msg_found() { return "見つけた! \xF0\x9F\x91\x80"; }

EMSCRIPTEN_KEEPALIVE
const char* msg_tab_away() { return "\xF0\x9F\x91\x8B 戻ってきて…"; }

EMSCRIPTEN_KEEPALIVE
const char* msg_console_title() { return " GOROman.card "; }

EMSCRIPTEN_KEEPALIVE
const char* msg_console_body() { return "無職だけど元気です。ソースは自由に読んでね。"; }

EMSCRIPTEN_KEEPALIVE
const char* msg_console_hint() { return "ヒント: コナミコマンドか \"gorogoro\" と打ってみて。"; }

}
