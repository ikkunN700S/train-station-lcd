// 行先テキストの幅を調整する関数
function adjustDestinationWidth(rowNumber) {
    const container = document.querySelector(`.board-row:nth-child(${rowNumber + 1}) .col-dest`);
    const textElement = document.getElementById(`disp-dest-${rowNumber}`);
    
    // 一旦スケールをリセットして実際の幅を測る
    textElement.style.transform = 'scaleX(1)';
    
    const containerWidth = container.clientWidth - 20; // 左右パディング分を引く
    const textWidth = textElement.scrollWidth;

    if (textWidth > containerWidth) {
        // はみ出す場合、比率を計算して縮小 (scaleX)
        const ratio = containerWidth / textWidth;
        textElement.style.transform = `scaleX(${ratio})`;
    } else {
        // 収まる場合は縮小解除
        textElement.style.transform = 'scaleX(1)';
    }
}

const typeData = {
    "local": { text: "普　通", className: "type-local" },
    "semirapid": { text: "区間快速", className: "type-semirapid" },
    "rapid": { text: "快　速", className: "type-rapid" },
    "newrapid": { text: "新快速", className: "type-newrapid" }
};

function setupSync(rowNumber) {
    // 時刻、両数、位置の同期
    ['time', 'cars', 'pos'].forEach(field => {
        const input = document.getElementById(`input-${field}-${rowNumber}`);
        const disp = document.getElementById(`disp-${field}-${rowNumber}`);
        input.addEventListener('input', (e) => { disp.textContent = e.target.value; });
    });

    // 行先の同期と幅調整
    const destInput = document.getElementById(`input-dest-${rowNumber}`);
    const destDisp = document.getElementById(`disp-dest-${rowNumber}`);
    
    destInput.addEventListener('input', (e) => {
        destDisp.textContent = e.target.value;
        adjustDestinationWidth(rowNumber); // 文字が変わるたびに計算
    });

    // 初回実行時にも幅を調整
    adjustDestinationWidth(rowNumber);

    // 種別の同期
    const typeInput = document.getElementById(`input-type-${rowNumber}`);
    const typeDisp = document.getElementById(`disp-type-${rowNumber}`);
    typeInput.addEventListener('change', (e) => {
        const data = typeData[e.target.value];
        typeDisp.textContent = data.text;
        typeDisp.className = 'type-box ' + data.className;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupSync(1);
    setupSync(2);
    
    // ウィンドウサイズが変わったときも再計算
    window.addEventListener('resize', () => {
        adjustDestinationWidth(1);
        adjustDestinationWidth(2);
    });
});

// 時刻表データからリアルタイムに表示する情報を更新する
// スプレッドシートの公開CSV URL
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUtXNKeKAMDN6dXxti5lbUcL8RHC1Hv5cICtJjHdwA7iS4pF44y1hWvWYK1udPhlXrZcySZGIk8dFU/pub?gid=0&single=true&output=csv";

// グローバル変数として時刻表を保持
let timetable = [];

// CSVをフェッチしてパースする関数
async function loadTimetableFromSheet() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        
        // 改行で分割して行ごとの配列にする
        const rows = csvText.trim().split('\n');
        
        // 1行目（ヘッダー）をスキップしてデータ部分を処理
        timetable = rows.slice(1).map(row => {
            // カンマで分割
            const cols = row.split(',');
            return {
                departure: cols[0],
                type: cols[1],
                dest: cols[2],
                cars: cols[3],
                pos: cols[4]
            };
        });

        console.log("時刻表データの読み込み完了:", timetable);
        
        // 読み込み完了後に初回の表示更新を走らせる
        updateDisplayFromTimetable();

    } catch (error) {
        console.error("時刻表の読み込みに失敗しました", error);
    }
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', () => {
    loadTimetableFromSheet(); // データ取得を開始
    
    // 定期更新（10秒ごとなど）
    setInterval(updateDisplayFromTimetable, 10000);
});

// 時間の文字列 (例: "15:30") を、0時からの合計分数 (例: 930) に変換する関数
function timeToMinutes(timeStr) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
}

// 時刻表から「これからの列車」を探して表示を更新するメイン関数
function updateDisplayFromTimetable() {
    const now = new Date();
    // 現在時刻を分数に変換
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 時刻表配列から、現在時刻「以降」に発車する列車だけを抽出（フィルタリング）
    const upcomingTrains = timetable.filter(train => {
        return timeToMinutes(train.departure) >= currentMinutes;
    });

    // 1段目と2段目の表示を更新
    for (let i = 1; i <= 2; i++) {
        // upcomingTrains[0] が次発、upcomingTrains[1] が次々発
        const train = upcomingTrains[i - 1];

        if (train) {
            // 列車データがある場合、各DOMのテキストを更新
            document.getElementById(`disp-time-${i}`).textContent = train.departure;
            document.getElementById(`disp-dest-${i}`).textContent = train.dest;
            document.getElementById(`disp-cars-${i}`).textContent = train.cars;
            document.getElementById(`disp-pos-${i}`).textContent = train.pos;

            // 種別ボックスの更新
            const typeDisp = document.getElementById(`disp-type-${i}`);
            const tData = typeData[train.type];
            typeDisp.textContent = tData.text;
            typeDisp.className = 'type-box ' + tData.className;

            // 長い駅名に対応するための関数を呼び出し
            adjustDestinationWidth(i);
        } else {
            // 本日の最終電車が終わった場合などの処理（表示を消す）
            document.getElementById(`disp-time-${i}`).textContent = "";
            document.getElementById(`disp-dest-${i}`).textContent = "";
            document.getElementById(`disp-cars-${i}`).textContent = "";
            document.getElementById(`disp-pos-${i}`).textContent = "";
            const typeDisp = document.getElementById(`disp-type-${i}`);
            typeDisp.textContent = "";
            typeDisp.className = 'type-box'; 
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // ページ読み込み時に1回目の中身を更新
    updateDisplayFromTimetable();

    // 10秒(10000ミリ秒)ごとに updateDisplayFromTimetable を実行し続ける
    setInterval(updateDisplayFromTimetable, 10000);

    // ウィンドウサイズ変更時の長体再計算
    window.addEventListener('resize', () => {
        adjustDestinationWidth(1);
        adjustDestinationWidth(2);
    });
});