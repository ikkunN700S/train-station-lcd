// 種別の表示名とクラス名のマッピング
const typeData = {
    "local": { text: "普　通", className: "type-local" },
    "semirapid": { text: "区間快速", className: "type-semirapid" },
    "rapid": { text: "快　速", className: "type-rapid" },
    "newrapid": { text: "新快速", className: "type-newrapid" },
    "specialrapid": { text: "特別快速", className: "type-specialrapid" }
};

// 入力と表示を同期する関数をセットアップ
function setupSync(rowNumber) {
    const inputs = ['time', 'dest', 'cars', 'pos'];
    
    // テキスト入力の同期
    inputs.forEach(field => {
        const inputEl = document.getElementById(`input-${field}-${rowNumber}`);
        const dispEl = document.getElementById(`disp-${field}-${rowNumber}`);
        
        inputEl.addEventListener('input', (e) => {
            dispEl.textContent = e.target.value;
        });
    });

    // 種別の同期（テキストと背景色を変更）
    const typeInput = document.getElementById(`input-type-${rowNumber}`);
    const typeDisp = document.getElementById(`disp-type-${rowNumber}`);

    typeInput.addEventListener('change', (e) => {
        const selected = e.target.value;
        const data = typeData[selected];
        
        // テキストの更新
        typeDisp.textContent = data.text;
        
        // クラスを一度すべて削除してから、新しいクラスを追加
        typeDisp.className = 'type-box'; 
        typeDisp.classList.add(data.className);
    });
}

// 1段目と2段目のイベントリスナーを登録
document.addEventListener('DOMContentLoaded', () => {
    setupSync(1);
    setupSync(2);
});