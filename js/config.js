// ==========================================
// config.js (共通設定・マスターデータ)
// ==========================================

// 1. スプレッドシートのベースURL
const CSV_BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUtXNKeKAMDN6dXxti5lbUcL8RHC1Hv5cICtJjHdwA7iS4pF44y1hWvWYK1udPhlXrZcySZGIk8dFU/pub?output=csv&single=true&gid=";

// 2. シートIDのリスト (一元管理)
const sheetIds = {
    "tokaido_kanayama_weekday_d": "1048215601", // 東海道線金山平日下りシートのgid
    "tokaido_kanayama_holiday_d": "1496874316", // 東海道線金山休日下りシートのgid
    "tokaido_kanayama_weekday_u": "430141393", // 東海道線金山平日上りシートのgid
    "tokaido_kanayama_holiday_u": "415946901", // 東海道線金山休日上りシートのgid

    "chuo_nagoya_weekday_d": "0",          // 中央西線名古屋平日下りシートのgid
    "chuo_nagoya_holiday_d": "393799729",  // 中央西線名古屋休日下りシートのgid

    "chuo_kanayama_weekday_d": "1094285652", // 中央西線金山平日下りシートのgid
    "chuo_kanayama_holiday_d": "946553047", // 中央西線金山休日下りシートのgid

    "chuo_tsurumai_weekday_d": "2108810631", // 中央西線鶴舞平日下りシートのgid
    "chuo_tsurumai_holiday_d": "1025263841", // 中央西線鶴舞休日下りシートのgid
    "chuo_tsurumai_weekday_u": "672148058", // 中央西線鶴舞平日上りシートのgid
    "chuo_tsurumai_holiday_u": "1531316906",  // 中央西線鶴舞休日上りシートのgid

    "subway_tsurumai_weekday_t": "1138879033", // 地下鉄鶴舞平日豊田市方面
    "subway_tsurumai_holiday_t": "667488261", // 地下鉄鶴舞休日豊田市方面

    "subway_shiogama_weekday_k": "371307575", // 地下鉄塩釜口平日上小田井方面
    "subway_shiogama_holiday_k": "1015188927"  // 地下鉄塩釜口休日上小田井方面
};

// 3. ダイヤのマスターリスト (一元管理)
const MASTER_SCHEDULES = [
    { value: "tokaido_kanayama_weekday_d", text: "東海道線 金山駅 [CA66] (平) 大垣方面" },
    { value: "tokaido_kanayama_holiday_d", text: "東海道線 金山駅 [CA66] (休) 大垣方面" },
    { value: "tokaido_kanayama_weekday_u", text: "東海道線 金山駅 [CA66] (平) 豊橋方面" },
    { value: "tokaido_kanayama_holiday_u", text: "東海道線 金山駅 [CA66] (休) 豊橋方面" },

    { value: "chuo_nagoya_weekday_d", text: "中央西線 名古屋駅 [CF00] (平) 中津川方面" },
    { value: "chuo_nagoya_holiday_d", text: "中央西線 名古屋駅 [CF00] (休) 中津川方面" },

    { value: "chuo_kanayama_weekday_d", text: "中央西線 金山駅 [CF01] (平) 中津川方面" },
    { value: "chuo_kanayama_holiday_d", text: "中央西線 金山駅 [CF01] (休) 中津川方面" },

    { value: "chuo_tsurumai_weekday_d", text: "中央西線 鶴舞駅 [CF02] (平) 中津川方面" },
    { value: "chuo_tsurumai_holiday_d", text: "中央西線 鶴舞駅 [CF02] (休) 中津川方面" },
    { value: "chuo_tsurumai_weekday_u", text: "中央西線 鶴舞駅 [CF02] (平) 名古屋方面" },
    { value: "chuo_tsurumai_holiday_u", text: "中央西線 鶴舞駅 [CF02] (休) 名古屋方面" },

    { value: "subway_tsurumai_weekday_t", text: "地下鉄 鶴舞駅 [T10] (平) 豊田市方面" },
    { value: "subway_tsurumai_holiday_t", text: "地下鉄 鶴舞駅 [T10] (休) 豊田市方面" },

    { value: "subway_shiogama_weekday_k", text: "地下鉄 塩釜口駅 [T16] (平) 上小田井方面" },
    { value: "subway_shiogama_holiday_k", text: "地下鉄 塩釜口駅 [T16] (休) 上小田井方面" }
];

// 4. セレクトボックスへの流し込み処理 (共通関数)
function initSelectOptions() {
    // クラス名 "schedule-select" がついたすべてのセレクトボックスを取得
    const selects = document.querySelectorAll('.schedule-select');
    
    selects.forEach(select => {
        // 中身を一度空にする（重複防止）
        select.innerHTML = '';
        
        // マスターリストに基づいて <option> タグを生成
        MASTER_SCHEDULES.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.value;
            opt.textContent = item.text;
            select.appendChild(opt);
        });
    });
}