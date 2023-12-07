// // 버튼과 비밀번호 입력 필드에 대한 참조를 가져옵니다.
// var button = document.getElementById('btn');
// var pwdInput = document.getElementById('pwd');

// // 메시지 입력 필드에 대한 참조를 가져옵니다.
// var messageNote = document.querySelector('.message_note');

// // 클릭마다 색상을 변경하기 위한 토글 변수를 선언합니다.
// var isColorToggle = false;

// // 버튼에 클릭 이벤트 리스너를 추가합니다.
// button.addEventListener('click', function() {
//     // 비밀번호가 4자리 숫자가 아닌 경우 경고 메시지를 표시합니다.
//     if (!pwdInput.value.match(/^\d{4}$/)) {
//         alert('비밀번호 4자리를 입력해 주세요!');
//         return;
//     }

//     // 메시지 입력 필드가 비어있는 경우 경고 메시지를 표시합니다.
//     if (messageNote.value.trim() === '') {
//         alert('메시지 내용을 작성해 주세요!');
//         return;
//     }

//     // 세션 스토리지에 이미 비밀번호가 저장되어 있는지 확인합니다.
//     var storedPwd = sessionStorage.getItem('password');
//     if (storedPwd && storedPwd !== pwdInput.value) {
//         alert('비밀번호는 하나만 사용할 수 있습니다!');
//         return;
//     }

//     // 세션 스토리지에 비밀번호 저장
//     sessionStorage.setItem('password', pwdInput.value);

//     // 새 textarea 요소를 생성합니다.
//     var newTextArea = document.createElement('textarea');
//     newTextArea.classList.add('message');

//     // 삭제 버튼 추가
//     var deleteButton = document.createElement('button');

//     deleteButton.innerText = '삭제';
//     deleteButton.classList.add('delete-button'); // 클래스 추가

//     deleteButton.addEventListener('click', function() {
//         var sessionPwd = sessionStorage.getItem('password');
//         if (sessionPwd === pwdInput.value) {
//             newTextArea.remove();
//             deleteButton.remove(); // 삭제 버튼 제거

//             // 세션에서 비밀번호 제거
//             sessionStorage.removeItem('password');
//         } else {
//             alert('본인이 작성한 메시지만 삭제할 수 있습니다!');
//         }
//     });


//     // 토글 변수에 따라 색상을 적용합니다.
//     if (isColorToggle) {
//         newTextArea.style.backgroundColor = 'rgb(255, 255, 204)'; // 첫 번째 색상
//     } else {
//         newTextArea.style.backgroundColor = 'rgb(204, 204, 255)'; // 두 번째 색상
//     }
//     isColorToggle = !isColorToggle;

//     // 새 textarea를 문서에 추가합니다.
//     var visitorsBox = document.getElementById('visitors');
//     visitorsBox.appendChild(newTextArea);

//     // 기존의 메시지 입력 필드를 비웁니다.
//     messageNote.value = '';

//     // 새로운 textarea에 삭제 버튼 추가
//     newTextArea.parentNode.insertBefore(deleteButton, newTextArea.nextSibling);
// });


// 버튼과 비밀번호 입력 필드에 대한 참조를 가져옵니다.
var button = document.getElementById('btn');
var pwdInput = document.getElementById('pwd');

// 메시지 입력 필드에 대한 참조를 가져옵니다.
var messageNote = document.querySelector('.message_note');

// 클릭마다 색상을 변경하기 위한 토글 변수를 선언합니다.
var isColorToggle = false;

// 버튼에 클릭 이벤트 리스너를 추가합니다.
button.addEventListener('click', function() {
    // 비밀번호가 4자리 숫자가 아닌 경우 경고 메시지를 표시합니다.
    if (!pwdInput.value.match(/^\d{4}$/)) {
        alert('비밀번호는 숫자 네 자리를 입력해 주세요!');
        return;
    }

    // 메시지 입력 필드가 비어있는 경우 경고 메시지를 표시합니다.
    if (messageNote.value.trim() === '') {
        alert('메시지 내용을 작성해 주세요!');
        return;
    }


    // 세션 스토리지에 저장된 비밀번호들을 배열로 가져옵니다.
    var storedPwdArray = JSON.parse(sessionStorage.getItem('passwords')) || [];

    // 세션 스토리지에 저장된 비밀번호가 있고, 현재 입력된 비밀번호와 다른 경우 경고 메시지를 표시합니다.
    if (storedPwdArray.length > 0 && !storedPwdArray.includes(pwdInput.value)) {
        alert('비밀번호는 하나만 사용할 수 있습니다!');
        return;
    }

    // 세션 스토리지에 저장된 비밀번호들을 배열로 가져옵니다.
    var storedPwdArray = JSON.parse(sessionStorage.getItem('passwords')) || [];
    
    // 새로운 비밀번호를 배열에 추가합니다.
    storedPwdArray.push(pwdInput.value);
    sessionStorage.setItem('passwords', JSON.stringify(storedPwdArray));

    // 새 textarea 요소를 생성합니다.
    var newTextArea = document.createElement('textarea');
    newTextArea.classList.add('message');

    // 삭제 버튼 추가
    var deleteButton = document.createElement('button');
    deleteButton.innerText = '삭제';
    deleteButton.classList.add('delete-button'); // 클래스 추가

    // 삭제 버튼 클릭 이벤트 리스너
    deleteButton.addEventListener('click', function() {
        var storedPwdArray = JSON.parse(sessionStorage.getItem('passwords')) || [];
        var pwdIndex = storedPwdArray.indexOf(pwdInput.value);
        if (pwdIndex !== -1) {
            // 세션 스토리지 배열에서 첫 번째 일치하는 비밀번호만 제거
            storedPwdArray.splice(pwdIndex, 1);
            sessionStorage.setItem('passwords', JSON.stringify(storedPwdArray));
    
            newTextArea.remove();
            deleteButton.remove(); // 삭제 버튼 제거
        } else {
            alert('본인이 작성한 메시지만 삭제할 수 있습니다!');
        }
    });
    

    // 토글 변수에 따라 색상을 적용합니다.
    if (isColorToggle) {
        newTextArea.style.backgroundColor = 'rgb(255, 255, 204)'; // 첫 번째 색상
    } else {
        newTextArea.style.backgroundColor = 'rgb(204, 204, 255)'; // 두 번째 색상
    }
    isColorToggle = !isColorToggle;

    // 새 textarea를 문서에 추가합니다.
    var visitorsBox = document.getElementById('visitors');
    visitorsBox.appendChild(newTextArea);

    // 기존의 메시지 입력 필드를 비웁니다.
    messageNote.value = '';

    // 새로운 textarea에 삭제 버튼 추가
    newTextArea.parentNode.insertBefore(deleteButton, newTextArea.nextSibling);
});


// ============================================================================= //


// MySQL DB 연결
document.getElementById('btn').addEventListener('click', function() {
    var message = document.getElementById('message_note').value; // Textarea에서 메시지 내용 가져옴
    var pwd = document.getElementById('pwd').value; // 비밀번호 필드에서 비밀번호 가져옴
  
    // fetch('/save-text', {
    fetch('http://localhost:3000/save-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: message, pwd: pwd }) // 메시지와 비밀번호를 JSON 형식으로 변환하여 서버에 전송
    })
    .then(response => response.text())
    .then(data => console.log(data)) // 서버 응답 처리
    .catch(error => console.error('Error:', error)); // 오류 처리
  });
  


// 다른 도메인이나 포트에서 실행되는 경우 오류 방지
const cors = require('cors');
app.use(cors());
