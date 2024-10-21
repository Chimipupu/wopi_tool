// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                         初期化
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// グローバル変数 初期化
let members = [];
let quests = [];
let g_footBathMembers = [];
let g_harinushiMembers = [];
let g_harinushiNames = [];
let g_footBathBackup = {};
let g_currentIndex = null;
let g_currentQuestIndex = null;

// 状態順の定義テーブル
let g_statusOrderTbl = ['参加', '貼り主', '足湯♨', '退社'];
let g_previousSortCriteria = "";// 前回のソート情報を保持
let g_isAscending = true;       // 昇順か降順か

const GATHERINGHUB = false;// false:集会場
const WOPICORP = true;     // true:全社員
let g_displayTgl_flg = GATHERINGHUB;

// 乱数生成
function getRandomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function initGroup() {
    groups = {};

    for (let i = 1; i <= 4; i++) {
        const groupName = `PT${i}`;
        groups[groupName] = {
            members: [],
            size: 0,
            quests: []
        };
    }
    // グループ表示を更新
    displayGroups(groups);
}

function insertEmptyRows() {
    const tbody = document.querySelector('#group_table tbody');
    for (let i = 1; i <= 4; i++) {
        let row = `<tr>
                        <td>PT${i}</td>
                        <td></td>
                        <td>0</td>
                        <td></td>
                </tr>`;
        tbody.innerHTML += row;
    }
}

function insertEmptyFootbath() {
    const tbody = document.querySelector('#footBath_table tbody');
    tbody.innerHTML = "";

    for (let i = 1; i <= 3; i++) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.textContent = "";
        cell.colSpan = 1;  // 必要に応じてcolSpanを設定
        row.appendChild(cell);
        tbody.appendChild(row);
    }
}

// ページ読み込み時のみ
window.onload = function () {
    // displayMemberTgl();
    footBath();
    displayMembers();
    initGroup();
}

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                         メイン処理
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// 集会所の人数計上関数
function fhMemberConuter() {
    const ghMemberCnt = members.filter(member => member[3] === '参加' || member[3] === '貼り主' || member[3] === '足湯♨').length;
    const ashiYuCnt = members.filter(member => member[3] === '足湯♨').length;
    let b_isOverGh = false;

    if (ghMemberCnt >= 16) {
        b_isOverGh = true;
    }

    return { ghMemberCnt, ashiYuCnt, b_isOverGh };
}

function displayMemberInfoTgl() {
    if (g_displayTgl_flg != GATHERINGHUB) {
        console.log("集会所 -> 全社員表示");
        const coropInMemberCount = members.filter(member => member[3] === '参加' || member[3] === '貼り主' || member[3] === '足湯♨').length;
        const coropOutMemberCount = members.filter(member => member[3] === '退社').length;
        headerText.innerHTML = `をぴの里♨（社員総数:<span id="corpMemberCnt">${members.length}</span>、出社:<span id="corpInMember">${coropInMemberCount}</span>、退社:<span id="corpOutMember">${coropOutMemberCount}</span>)`;
    } else {
        console.log("集会所 <- 全社員表示");
        let ghMemberCnt = members.filter(member => member[3] === '参加' || member[3] === '貼り主' || member[3] === '足湯♨').length;
        const ashiYuCnt = members.filter(member => member[3] === '足湯♨').length;
        // ghMemberCnt = ghMemberCnt - ashiYuCnt;
        headerText.innerHTML = `集会場 (<span id="ghMemberCount">${ghMemberCnt}</span>/16、足湯:<span id="ashiYuCount">${ashiYuCnt}</span>)`;
    }
}

// 集会場と全社員表示のトグル
function displayMemberTgl() {
    g_displayTgl_flg = !g_displayTgl_flg;

    displayMemberInfoTgl();

    // initGroup();
    // resetGroups();
    displayGroups();

    g_statusOrderTbl = ['参加', '貼り主', '足湯♨', '退社'];
    // if(g_displayTgl_flg != GATHERINGHUB){
    //     g_statusOrderTbl = ['参加', '貼り主', '足湯♨', '退社'];
    // }else{
    //     g_statusOrderTbl = ['参加', '貼り主', '足湯♨'];
    // }

    footBath();
}

// 全参加者を退社にして配信終了
function allMemberCorpOut() {
    members.forEach((member, index) => {
        if (member[3] !== '退社') {
            member[3] = '退社';
        }
    });

    footBath();
}

// テーブルシフト関数
function getNextStatusOrder() {
    console.log("前回の状態ソートテーブル:", g_statusOrderTbl);

    // テーブルを右シフト
    if (g_statusOrderTbl.length > 0) {
        const lastStatus = g_statusOrderTbl.pop();
        g_statusOrderTbl.unshift(lastStatus);
        console.log("今回の状態ソートテーブル:", g_statusOrderTbl);
    } else {
        console.error("状態ソートテーブルが空です。");
    }
}

// 並び替え関数（ソート）
function sortMembers() {
    const sortCriteria = document.getElementById("memberSort").value;

    // 前回と同じソート基準が選ばれた場合、昇順・降順を切り替え
    if (sortCriteria === g_previousSortCriteria) {
        g_isAscending = !g_isAscending;
    } else {
        g_isAscending = true; // デフォルトは昇順
    }

    // ソート
    switch (sortCriteria) {
        case "名前順":
            members.sort((a, b) => g_isAscending ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]));
            break;
        case "HR順":
            members.sort((a, b) => g_isAscending ? a[1] - b[1] : b[1] - a[1]);
            break;
        case "MR順":
            members.sort((a, b) => g_isAscending ? a[2] - b[2] : b[2] - a[2]);
            break;
        // 状態異常でのソートだけテーブルを右シフト
        // ※テーブルの初期値 ...集会所表示は['参加', '貼り主', '足湯♨']
        // ※テーブルの初期値 ...全社員表示は['参加', '貼り主', '足湯♨', '退社']
        case "状態順":
            members.sort((a, b) => {
                return g_statusOrderTbl.indexOf(a[3]) - g_statusOrderTbl.indexOf(b[3]);
            });
            getNextStatusOrder();
            break;
        default:
            console.error("未知のソート要求");
            break;
    }

    // ソートを記憶
    g_previousSortCriteria = sortCriteria;

    displayMembers();
}

// メンバー情報追加関数
function addMember() {
    const name = document.getElementById('name').value;
    let hr = document.getElementById('hr').value;
    let mr = document.getElementById('mr').value;
    const newStatus = document.getElementById('memberStatus').value;
    const member = members.find(member => member[0] === name);
    const oldStatus = member ? member[3] : null;

    // 【For DEBUG】デバッグモードをトグル
    // if (name === "をぴの里はホワイト企業") {
    //     alert("【開発者向け】ようこそ！ホワイト企業 をぴの里へ♨ デバッグモードをトグルします♪");
    //     console.log("Toggle DebugSection at HTML!");
    //     toggleDebugSection();
    //     return; // 処理を中断
    // }

    // 名前が空欄
    if (name === "") {
        alert("名前を入力してください！");
        return; // 処理を中断
    }

    // 既にいる
    if (members.some(member => member[0] === name)) {
        alert("このメンバーはすでに存在します。");
        return;
    }

    // （フェールセーフ）集会所が最大人数以上の参加対策
    const result = fhMemberConuter();
    if (result.b_isOverGh != false && newStatus !== '退社') {
        alert("集会場が満員です！参加はできません！");
        return;
    }

    // HRとMRが空欄の場合に乱数を代入
    if (hr === "") {
        hr = Math.floor(Math.random() * 1000); // 0～999のランダムな数値をHRに代入
    }

    if (mr === "") {
        mr = Math.floor(Math.random() * 1000); // 0～999のランダムな数値をMRに代入
    }

    members.push([name, hr, mr, newStatus]);
    footBath();
    displayMembers();
    saveData();
}

function removeMember() {
    const name = document.getElementById('name').value;
    members = members.filter(member => member[0] !== name);
    g_footBathMembers = g_footBathMembers.filter(member => member !== name);
    displayMembers();
    displayFootBath();
    updateGroups();
    saveData();
}

function updateMember() {
    const name = document.getElementById('name').value.trim();
    const hr = document.getElementById('hr').value.trim();
    const mr = document.getElementById('mr').value.trim();
    const newStatus = document.getElementById('memberStatus').value;
    const member = members.find(member => member[0] === name);
    const oldStatus = member ? member[3] : null;

    if (name === '' || hr === '' || mr === '' || newStatus === '') {
        alert('入力してください');
        return;
    }

    // 貼り主が4人以上のときは跳ね除ける
    let harinushiLen = members.filter(member => member[3] === '貼り主').length;
    if (newStatus === '貼り主' && harinushiLen >= 4) {
        alert("貼り主は4人までです!");
        return;
    }

    // （フェールセーフ）最大人数以上の退社->出勤対策
    const result = fhMemberConuter();
    if (result.b_isOverGh != false && oldStatus === '退社' && newStatus !== '退社') {
        alert("集会場が満員です！参加はできません！");
        return;
    }

    // メンバー情報の更新
    members[g_currentIndex] = [name, hr, mr, newStatus];
    displayMembers();
    g_currentIndex = null;

    // データの保存
    footBath();
    saveData();
}

// 足湯関数
function footBath() {
    let name = '';

    // ステータスが足湯の人を足湯メンバーに追加
    members.forEach((member, index) => {
        if (member[3] === '足湯♨') {
            name = members[index][0];
            // 足湯メンバーにいないなら
            if (!g_footBathMembers.includes(name)) {
                g_footBathMembers.push(name);
                g_footBathBackup[name] = [...members.filter(member => member[0] !== name)];
            }
        }
    });

    // ステータスが足湯ではないのに足湯メンバーにいるひとを除外
    members.forEach((member) => {
        const name = member[0];
        if (member[3] !== '足湯♨') {
            const index = g_footBathMembers.indexOf(name);
            if (index !== -1) {
                g_footBathMembers.splice(index, 1);
                delete g_footBathBackup[name];
            }
        }
    });

    updateGroups();
    displayMembers();
    displayFootBath();
    saveData();
}

function fillForm(index) {
    const member = members[index];
    document.getElementById('name').value = member[0];
    document.getElementById('hr').value = member[1];
    document.getElementById('mr').value = member[2];
    g_currentIndex = index;
}

// グループ初期化関数
function resetGroups() {
    groups = {};
    g_harinushiMembers = {};
    let generateGroupCnt = 4;

    for (let i = 1; i <= generateGroupCnt; i++) {
        const groupName = `PT${i}`;
        groups[groupName] = {
            members: [],
            size: 0,
            quests: []
        };
    }

    // グループ表示を更新
    displayGroups(groups);
}

// 手動グループ分け関数
function moveGroups() {
    const memberName = document.getElementById('name').value.trim();
    const memberIndex = members.findIndex(member => member[0] === memberName);

    // 全社員表示ではグループ分けしない
    if (g_displayTgl_flg != GATHERINGHUB) {
        alert("全社員表示中はPTの手動振り分けはできません！");
        return;
    }

    if (memberIndex === -1) {
        alert("指定されたメンバーが見つかりません！");
        return;
    }

    const member = members[memberIndex][0];

    // メンバーが足湯状態の場合は移動できない
    if (g_footBathMembers.includes(member)) {
        alert("足湯状態のメンバーはグループに追加できません！");
        return;
    }

    // 既にグループに所属しているかチェック
    let currentGroup = null;
    for (const [groupName, group] of Object.entries(groups)) {
        if (group.members.includes(member)) {
            currentGroup = groupName;
            break;
        }
    }

    // グループ名を小文字に変換
    const groupNames = Object.keys(groups).map(name => name.toLowerCase());

    if (groupNames.length === 0) {
        alert("グループが存在しません。新しいグループを作成してください。");
        return;
    }

    // グループ選択ダイアログを表示
    const selectedGroup = prompt(`追加するグループを選択してください:\n${Object.keys(groups).join('\n')}`);
    if (!selectedGroup) {
        alert("グループ名が入力されていません。");
        return;
    }

    const selectedGroupLower = selectedGroup.trim().toLowerCase();
    if (!groupNames.includes(selectedGroupLower)) {
        alert("無効なグループ名です。");
        return;
    }

    // 小文字のグループ名から元のグループ名を取得
    const actualGroupName = Object.keys(groups).find(name => name.toLowerCase() === selectedGroupLower);
    if (!actualGroupName) {
        alert("グループ名が見つかりません。");
        return;
    }

    // 追加先のグループを取得
    const group = groups[actualGroupName];
    if (group.size >= 4) {
        alert("選択したグループは満員です。別のグループを選択してください。");
        return;
    }

    // 現在のグループからメンバーを削除
    if (currentGroup && currentGroup !== actualGroupName) {
        const currentGroupObj = groups[currentGroup];
        const memberIndex = currentGroupObj.members.indexOf(member);
        if (memberIndex !== -1) {
            currentGroupObj.members.splice(memberIndex, 1);
            currentGroupObj.size--;
        }
    }

    // グループにメンバーを追加
    if (!group.members.includes(member)) {
        group.members.push(member);
        group.size++;
    }

    // グループ表示を更新
    displayGroups(groups);

    // データの保存
    saveData();
}

// 貼り主の計算関数
function calculateHarinosu(memberCount) {
    if (memberCount >= 1 && memberCount <= 5) {
        return 1;
    } else if (memberCount >= 6 && memberCount <= 9) {
        return 2;
    } else if (memberCount >= 10 && memberCount <= 13) {
        return 3;
    } else if (memberCount >= 14 && memberCount <= 16) {
        return 4;
    } else {
        return 99; // 1〜16以外の場合のエラーハンドリング
    }
}

// 自動グループ分け関数
function generateGroups() {
    // デフォルトのモードは均等優先モード
    const mode = document.getElementById("generateGroupMode").value;
    const result = fhMemberConuter();

    let finalGroups = [];
    groups = {};
    resetGroups();
    let groupMemberCnt = 0;

    // 集会所表示のときは足湯と退社は除外
    let activeMembers = members.filter(member => member[3] !== '足湯♨' && member[3] !== '退社');
    // 元のメンバー配列を破壊しないために、新しい配列にコピーしてシャッフル
    const shuffledMembers = shuffleArray([...activeMembers]);

    // 生成するグループの数を計算
    let generateGroupCnt = 0;
    const ghMembercnt = result.ghMemberCnt;
    let activeMembersCnt = result.ghMemberCnt - result.ashiYuCnt;
    console.log("生成グループ対象人数:", activeMembersCnt);

    // 貼り主の炙り出し
    const harinushiMembers = members.filter(member => member[3] === '貼り主');
    // 貼り主の名前
    g_harinushiNames = members
        .filter(member => member[3] === '貼り主')
        .map(member => member[0]);
    console.log("貼り主名一覧", g_harinushiNames);
    // 貼り主のインデックス
    const harinushiIndex = members
        .map((member, index) => member[3] === '貼り主' ? index : -1)
        .filter(index => index !== -1);
    const harinushiCnt = harinushiMembers.length;
    console.log("貼り主を列挙:", harinushiMembers);
    harinushiIndex.forEach(index => {
        console.log(`貼り主のインデックス: ${index}`);
        console.log(`貼り主の名前: ${members[index][0]}`);
    });
    console.log("貼り主数:", harinushiCnt);

    generateGroupCnt = harinushiCnt;
    if (activeMembers.length == 0) {
        alert("メンバーがいません");
        return;
    }

    // 貼り主が何人必要か計算
    let harinushiCalcCnt = 0;
    if ((activeMembersCnt < 4) && (harinushiCnt == 0)) {
        harinushiCalcCnt = 1;
    } else {
        switch (mode) {
            case "効率":
                let res = calculateHarinosu(activeMembersCnt);
                console.log("PT効率の貼り主数計算値:", res);
                if(res != 99) // 99 = 人数が1～16人以外は計算不可
                    harinushiCalcCnt = res;
                else{
                    alert("グループ生成は人数が1～16人の範囲でしかできません");
                    return;
                }
                break;

            case "均等":
            default:
                harinushiCalcCnt = Math.ceil(activeMembersCnt / 4);
                break;
        }
    }

    console.log("貼り主必要数:", harinushiCalcCnt);
    if ((harinushiCnt !== harinushiCalcCnt)) {
        console.log("生成グループ失敗 ... 貼り主が不足");
        alert("貼り主を" + harinushiCalcCnt + "人指定してください");
        return;
    }

    // ここからグループ生成開始
    generateGroupCnt = harinushiCalcCnt;
    console.log("生成グループ数:", generateGroupCnt);

    const groupSize = Math.ceil(activeMembersCnt / generateGroupCnt); // 各グループのサイズ
    console.log("各グループサイズ:", groupSize);

    // 貼り主を優先して各グループに1人ずつ振り分け
    harinushiMembers.forEach(member => {
        const groupName = `PT${(groupMemberCnt % generateGroupCnt) + 1}`;
        if (!groups[groupName]) {
            groups[groupName] = { members: [], size: 0 };
        }
        groups[groupName].members.push(member[0]); // メンバーの名前のみを追加
        groups[groupName].size++;
        groupMemberCnt++;
        activeMembersCnt--;
        console.log("貼り主配置:", groups);
    });
    console.log("貼り主のグループ配置完了:", groups);

    // 残りメンバーの処理
    const remainingMembers = shuffledMembers.filter(member => member[3] !== '貼り主');
    console.log("残りメンバー:", remainingMembers);
    console.log("残りメンバー数:", activeMembersCnt);

    // 貼り主のインデックスを除外したインデックスの配列を作成
    const activeMemberIndex = members
        .map((member, index) => member[3] === '参加' ? index : -1)
        .filter(index => index !== -1);

    function getRandomIndex() {
        if (activeMemberIndex.length === 0) {
            return null; // 非貼り主がいない場合
        }

        // ランダムなインデックスを生成
        const randomIndex = Math.floor(Math.random() * activeMemberIndex.length);
        const selectedIndex = activeMemberIndex[randomIndex];

        activeMemberIndex.splice(randomIndex, 1);

        return selectedIndex;
    }

    // 均等優先モード
    if (mode === "均等") {
        console.log("均等優先モード開始");
        // 残りのメンバーを均等に振り分ける
        groupMemberCnt = 0;
        remainingMembers.forEach(member => {
            const groupName = `PT${(groupMemberCnt % generateGroupCnt) + 1}`;
            if (!groups[groupName]) {
                groups[groupName] = { members: [], size: 0 };
            }
            groups[groupName].members.push(member[0]);
            groups[groupName].size++;
            groupMemberCnt++;
            activeMembersCnt--;
            console.log("残りメンバー数:", activeMembersCnt);
        });
        console.log("均等優先モード完了:", groups);
    } else {
        console.log("PT効率優先モード開始");
        let allOtherGroupsAreFull = false;
        let groupsCnt = 0;
        let randomIndex = 0;
        let groupMemberCnt = 0;

        while (activeMembersCnt > 0) {
            // randomIndex = getRandomIndex();
            const groupName = `PT${groupsCnt + 1}`;
            console.log("現在グループ", groupName)

            if (!groups[groupName]) {
                groups[groupName] = { members: [], size: 0 };
            }

            if ((groupsCnt == 0) && (groups[groupName].size < 4) && (activeMembersCnt < 5)) {
                while ((groups[groupName].size < 4) && (activeMembersCnt > 0)) {
                    randomIndex = getRandomIndex();
                    groups[groupName].members.push(members[randomIndex][0]);
                    groups[groupName].size++;
                    activeMembersCnt--;
                    groupMemberCnt++;
                    console.log("現在のグループ数", groupMemberCnt);
                }                // グループに追加せず、足湯メンバーを表示
                console.log("1グループ4人で終了", groupName);
                allOtherGroupsAreFull = true;
                groupsCnt++;
                groupMemberCnt = 0;
                continue;
            }

            // グループのサイズが4人未満の場合にメンバーを追加
            if ((groups[groupName].size < 4) && (activeMembersCnt >= 3)) {
                while (groups[groupName].size < 4 && randomIndex < members.length) {
                    randomIndex = getRandomIndex();
                    groups[groupName].members.push(members[randomIndex][0]);
                    groups[groupName].size++;
                    activeMembersCnt--;
                    groupMemberCnt++;
                    console.log("現在のグループ数", groupMemberCnt);
                }
                console.log("グループが4人です", groupName);
                groupsCnt++;
                allOtherGroupsAreFull = true;
                groupMemberCnt = 0;
                continue;
            }

            if ((groupsCnt > 0) && (groups[groupName].size > 0) && (groups[groupName].size < 2) && allOtherGroupsAreFull && (activeMembersCnt >= 1)) {
                while (groups[groupName].size < 2 && randomIndex < members.length) {
                    randomIndex = getRandomIndex();
                    groups[groupName].members.push(members[randomIndex][0]);
                    groups[groupName].size++;
                    activeMembersCnt--;
                    groupMemberCnt++;
                    console.log("現在のグループ数", groupMemberCnt);
                };
                console.log("グループ人数2人で終了します", groupName);
                groupsCnt++;
                allOtherGroupsAreFull = true;
                groupMemberCnt = 0;
            }

            // 残り1名が足湯メンバーに設定される条件
            if ((groupsCnt > 0) && (activeMembersCnt == 1) && allOtherGroupsAreFull) {
                console.log(`残り1名が足湯メンバーに設定されました: ${members[randomIndex][0]}`);
                members[randomIndex][3] = '足湯♨';
                alert(`割り振り完了！${members[randomIndex][0]} は足湯メンバーです！`);

                // グループに追加せず、足湯メンバーを表示
                footBath();
                displayGroups(groups);
                break;
            }
        }
    }

    console.log("PT効率優先モード完了:", groups);

    // グループ情報を構成
    Object.keys(groups).forEach((groupName) => {
        finalGroups.push({
            members: groups[groupName].members,
            size: groups[groupName].size,
            quests: []
        });
    });

    // グループを表示
    footBath();
    displayGroups(groups);
}

// 配列をシャッフルする関数
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// グループの更新関数
function updateGroups() {
    let updatedGroups = {};
    const groupTable = document.getElementById("group_table");

    // initGroup();

    if (groupTable && groupTable.children.length > 0) {
        const rows = groupTable.querySelectorAll("tbody tr");

        rows.forEach(row => {
            const groupName = row.children[0].textContent;
            const membersInGroup = row.children[1].textContent.split(', ').map(member => member.trim());

            // 足湯メンバーを除外
            const updatedGroup = membersInGroup.filter(member => !g_footBathMembers.includes(member));

            if (updatedGroup.length > 0) {
                updatedGroups[groupName] = {
                    members: updatedGroup,
                    size: updatedGroup.length,
                    quests: [] // 必要に応じてクエスト情報を追加
                };
            }
        });
    }

    // グループサイズを調整するために、最大4人になるようにする
    const allMembers = Object.values(updatedGroups).flatMap(group => group.members);
    let groupsBySize = {};

    // メンバーを再グループ化するための関数
    function createGroups(members) {
        const groupSize = 4; // 初期のグループサイズ
        let group = [];

        while (members.length) {
            if (group.length < groupSize) {
                group.push(members.shift());
            }
            if (group.length === groupSize) {
                groupsBySize[`PT${Object.keys(groupsBySize).length + 1}`] = {
                    members: group,
                    size: group.length,
                    quests: [] // 必要に応じてクエスト情報を追加
                };
                group = [];
            }
        }

        // 残りのメンバーがいる場合
        if (group.length) {
            groupsBySize[`PT${Object.keys(groupsBySize).length + 1}`] = {
                members: group,
                size: group.length,
                quests: [] // 必要に応じてクエスト情報を追加
            };
        }
    }
    // グループ作成
    createGroups(allMembers);
    displayGroups(groupsBySize);
}

// メンバー情報の表示
function displayMembers() {
    let htmlTable = "<table><thead><tr><th>名前</th><th>HR</th><th>MR</th><th>状態</th></tr></thead><tbody>";

    console.log("メンバーリスト:", members);

    for (let index = 0; index < members.length; index++) {
        const member = members[index];
        let statusClass = '';
        switch (member[3]) {
            case '貼り主':
                statusClass = 'statusHost';
                break;
            case '足湯♨':
                statusClass = 'statusFootBath';
                break;
            case '退社':
                statusClass = 'statusCorpOut';
                break;
            default:
                statusClass = 'statusJoin';
        }

        // 集会所表示 && 退社の人は表示しない
        // if (g_displayTgl_flg != WOPICORP && member[3] === '退社') {
        //     continue;
        // }

        htmlTable += `<tr onclick="fillForm(${index})">
            <td>${member[0]}</td>
            <td>${member[1]}</td>
            <td>${member[2]}</td>
            <td class="${statusClass}">${member[3]}</td>
        </tr>`;
    }

    htmlTable += "</tbody></table>";
    document.getElementById("member_table").innerHTML = htmlTable;
    displayMemberInfoTgl();
}

function displayGroups() {
    const tbody = document.querySelector("#group_table tbody");
    tbody.innerHTML = "";  // テーブルの内容をリセット

    // groupsが定義されているか確認
    if (typeof groups === 'object' && Object.keys(groups).length > 0) {
        Object.entries(groups).forEach(([groupName, group]) => {
            const row = document.createElement('tr');

            // PT名セル
            const ptCell = document.createElement('td');
            ptCell.textContent = groupName;
            row.appendChild(ptCell);

            // メンバーセル
            const memberCell = document.createElement('td');
            if (group.members) {
                // メンバー名をハイライト
                memberCell.innerHTML = group.members.map(member => {
                    // 貼り主の場合は<span>で囲む
                    return g_harinushiNames.includes(member)
                        ? `<span class="highlight">${member}</span>`
                        : member;
                }).join(', '); // カンマで結合
            }
            row.appendChild(memberCell);

            // 人数セル
            const sizeCell = document.createElement('td');
            sizeCell.textContent = group.size || 0;
            row.appendChild(sizeCell);

            // クエストセル
            const questCell = document.createElement('td');
            questCell.textContent = group.quests && group.quests.length > 0 ? group.quests.join(', ') : '';
            row.appendChild(questCell);

            tbody.appendChild(row);
        });
    }
}

// クエスト追加関数
function addQuest() {
    const name = document.getElementById('questName').value.trim();

    // 空欄チェック
    if (name === "") {
        alert("クエスト名を入力してください！");
        return;
    }

    quests.push([name]);
    displayQuests();
    saveData();
}

function removeQuest() {
    const name = document.getElementById('questName').value;
    quests = quests.filter(quest => quest[0] !== name);
    displayQuests();
    saveData();
}

function updateQuest() {
    if (g_currentQuestIndex !== null) {
        const name = document.getElementById('questName').value;
        quests[g_currentQuestIndex] = [name];
        displayQuests();
        g_currentQuestIndex = null;
        saveData();
    }
}

function displayQuests() {
    const tbody = document.querySelector('#quest_table tbody');
    tbody.innerHTML = ""; // テーブルの内容をリセット

    quests.forEach((quest, index) => {
        const row = document.createElement('tr');
        row.addEventListener('click', () => fillQuestForm(index));

        const cell = document.createElement('td');
        cell.textContent = quest[0];
        row.appendChild(cell);
        tbody.appendChild(row);
    });
}

function fillQuestForm(index) {
    const quest = quests[index];
    console.log(`Quest ${index} clicked:`, quests[index]);
    document.getElementById('questName').value = quest[0];
    g_currentQuestIndex = index;
}

// クエストのランダム選択関数
function randomizeQuests() {
    const groupElements = document.querySelectorAll("#group_table tbody tr");

    // 全社員表示ではグループ分けしない
    if (g_displayTgl_flg != GATHERINGHUB) {
        alert("全社員表示中はPTにクエストのランダム振り分けはできません！");
        return;
    }

    groupElements.forEach((groupRow, index) => {
        const questCell = groupRow.querySelector("td:nth-child(4)");
        if (quests.length > 0) {
            // 乱数でクエストを選択
            const randomQuest = quests[getRandomNum(0, quests.length)];
            // const randomQuest = quests[Math.floor(Math.random() * quests.length)];
            questCell.textContent = randomQuest[0];
        } else {
            questCell.textContent = '';
        }
    });
}

// ローカルストレージ保存関数
function saveData() {
    localStorage.setItem("members", JSON.stringify(members));
    localStorage.setItem("quests", JSON.stringify(quests));
    localStorage.setItem("footBathMembers", JSON.stringify(g_footBathMembers));
}

// ローカルストレージ読み出し関数
function loadData() {
    // ローカルストレージのデータをJSON形式でパース
    members = JSON.parse(localStorage.getItem("members")) || [];
    quests = JSON.parse(localStorage.getItem("quests")) || [];
    g_footBathMembers = JSON.parse(localStorage.getItem("footBathMembers")) || [];

    displayMembers();
    displayQuests();
    displayFootBath();
    updateGroups();
}

function displayFootBath() {
    const tbody = document.querySelector('#footBath_table tbody');
    const footBathMemberCount = g_footBathMembers.length;
    const rows = tbody.querySelectorAll('tr');

    // メンバーがいる場合
    if (footBathMemberCount > 0) {
        g_footBathMembers.forEach((member, index) => {
            // すでに存在する<tr>を利用する
            let row;
            if (index < rows.length) {
                row = rows[index];
                row.querySelector('td').textContent = member;
            } else {
                // 新しい<tr>を作成する
                row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.textContent = member;
                row.appendChild(cell);
                tbody.appendChild(row);
            }
        });

        // 余分な<tr>があれば削除
        for (let i = footBathMemberCount; i < rows.length; i++) {
            tbody.removeChild(rows[i]);
        }
    } else {
        // メンバーがいない場合の処理
        insertEmptyFootbath();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    insertEmptyRows();
    insertEmptyFootbath();
    loadData();
});

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                         YouTube関連
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// URLオープン
function openURL(url){
    window.open(url, '_blank'); // 新しいタブで表示の場合
    // window.location.href = url; // 上書き表示の場合
}

// YouTube Live「開く」ボタン
function openYtLiveURL(){
    const url = document.getElementById('ytLiveURL').value.trim();
    openURL(url);
}

// YouTube アーカイブ「開く」ボタン
function openYtArchiveURL(){
    const url = document.getElementById('ytArchiveURL').value.trim();
    openURL(url);
}