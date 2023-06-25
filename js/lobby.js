let form = document.getElementById('lobby__form');

let displayName = sessionStorage.getItem('display_name');
if(displayName){
    form.namespaceURI.value = displayName;
}

form.addEventListener('submit', (e)=>{

    e.preventDefault();

    sessionStorage.setItem('display_name', e.target.name.value)

    let inviteCode = e.target.room.value;
    if(!inviteCode){
        let string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            inviteCode = '';

            for(let i = 0; i < 3; i++){

                let index1 = Math.floor(Math.random()*61 + 0);
                let index2 = Math.floor(Math.random()*61 + 0);
                let index3 = Math.floor(Math.random()*61 + 0);
                if(i != 2){
                    inviteCode += `${string[index1]}${string[index2]}${string[index3]}-`;
                }else{
                    inviteCode += `${string[index1]}${string[index2]}${string[index3]}`;
                }
            }
    }
    window.location = `index.html?room=${inviteCode}`;

});

let generateUniqueRoomId = () => {

    let roomIDInputField = document.getElementById('lobby_room_id_btn');
    let string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    newlyGeneratedId = '';

    for(let i = 0; i < 3; i++){

        let index1 = Math.floor(Math.random()*61 + 0);
        let index2 = Math.floor(Math.random()*61 + 0);
        let index3 = Math.floor(Math.random()*61 + 0);

        if(i != 2){
            newlyGeneratedId += `${string[index1]}${string[index2]}${string[index3]}-`;
        }else{
            newlyGeneratedId += `${string[index1]}${string[index2]}${string[index3]}`;
        }
    }

    roomIDInputField.value = newlyGeneratedId;
    navigator.clipboard.writeText(newlyGeneratedId);

    let copyText = document.getElementById('copyText');
    copyText.style.top = '0';
    
    let lobbyForm = document.getElementById('lobby__form');
    lobbyForm.style.height = '465px';

    setTimeout(() => {
        copyText.style.top = '25px';
        lobbyForm.style.height = '427px';
    }, 3000);
        
}

document.getElementById('lobby_generate_room_id_btn').addEventListener('click', generateUniqueRoomId);