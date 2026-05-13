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