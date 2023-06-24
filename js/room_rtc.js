const APP_ID = "93d90e79771849238dac8499432987ec"

let uid = sessionStorage.getItem('uid');
if(!uid){
    uid = String(Math.floor(Math.random()*100000));
    sessionStorage.setItem('uid', uid)
}

let token = null;
let client;

let rtmClient;
let channel;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let roomID = urlParams.get('room')

if(!roomID){
    roomID = 'main';
}

let displayName = sessionStorage.getItem('display_name');
if(!displayName){
    window.location = 'lobby.html';
}

let localTracks = [];
let remoteUsers = {};

let localScreenTracks;
let sharingScreen = false;

let joinRoomInit = async () => {

    rtmClient = AgoraRTM.a(APP_ID);
    await rtmClient.login({uid, token});

    await rtmClient.addOrUpdateLocalUserAttributes({'name': displayName})

    channel = await rtmClient.createChannel(roomID);
    await channel.join();

    channel.on('MemberJoined', handleMemberJoined);
    channel.on('MemberLeft', handleMemberLeft) ;
    channel.on('ChannelMessage', handleChannelMessage);

    await getMembers();

    addBotMessageToDom(`Welcome to the room ${displayName}! 👋`);

    client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'});
    await client.join(APP_ID, roomID, token, uid);
    
    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);

};

let joinStream = async () => {

    document.getElementById('join-btn').style.display = 'none';
    document.getElementsByClassName('stream__actions')[0].style.display = 'flex';

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({}, {encoderConfig: {
        width: {min: 640, ideal: 1920, max: 1920},
        height: {min: 480, idel: 1080, max: 1080}
    }});

    let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                  </div>`

    document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
    document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

    localTracks[1].play(`user-${uid}`);
    await client.publish([localTracks[0], localTracks[1]]);
};

let switchToCamera = async () => {

    let player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                  </div>`;
    displayFrame.insertAdjacentHTML('beforeend', player);

    await localTracks[0].setMuted(true);
    await localTracks[1].setMuted(true);

    document.getElementById('mic-btn').classList.remove('active');
    document.getElementById('screen-btn').classList.remove('active');
    
    localTracks[1].play(`user-${uid}`);
    await client.publish([localTracks[1]])

};

let handleUserPublished = async (user, mediaType) => {

    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    let player = document.getElementById(`user-container-${user.uid}`);
    if(player === null){
        player = `<div class="video__container" id="user-container-${user.uid}">
                    <div class="video-player" id="user-${user.uid}"></div>
                  </div>`;
        document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
        document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame);
    }

    if(displayFrame.style.display){
        let videoFrame = document.getElementById(`user-container-${user.id}`)
        videoFrame.style.height = '100px';
        videoFrame.style.width = '100px'
    }

    if(mediaType === 'video'){
        user.videoTrack.play(`user-${user.uid}`)
    }

    if(mediaType === 'audio'){
        user.audioTrack.play();
    }

}

let handleUserLeft = async (user) => {

    delete remoteUsers[user.uid];
    let item = document.getElementById(`user-container-${user.uid}`);
    if(item){
        item.remove();
    }

    if(`user-container-${user.uid}` === userIdInDisplayFrame){
        displayFrame.style.display = null;
        let videoFrames = document.getElementsByClassName('video__container');
        for(let i = 0; i < videoFrames.length; i++){
            videoFrames[i].style.height = '300px';
            videoFrames[i].style.width = '300px';
        }
    }
}

let toggleCamera = async (e)=>{

    let button = e.currentTarget;

    if(localTracks[1].muted){
        await localTracks[1].setMuted(false);
        button.classList.add('active');
    }else{
        await localTracks[1].setMuted(true);
        button.classList.remove('active');
    }
}

let toggleMic = async (e)=>{

    let button = e.currentTarget;

    if(localTracks[0].muted){
        await localTracks[0].setMuted(false);
        button.classList.add('active');
    }else{
        await localTracks[0].setMuted(true);
        button.classList.remove('active');
    }
}

let toggleScreen = async (e) => {

    let screenButton = e.currentTarget;
    let cameraBtn = document.getElementById('camera-btn');

    if(!sharingScreen){

        sharingScreen = true;
        screenButton.classList.add('active');
        cameraBtn.classList.remove('active');

        await client.unpublish([localTracks[1]]);

        cameraBtn.style.display = 'none';

        try{
            localScreenTracks = await AgoraRTC.createScreenVideoTrack();
        }catch(error){
            cameraBtn.style.display = 'inline-block';
            document.getElementById(`user-container-${uid}`).remove();
            switchToCamera();
        }

        document.getElementById(`user-container-${uid}`).remove();
        displayFrame.style.display = 'block';

        player = `<div class="video__container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                  </div>`;
        displayFrame.insertAdjacentHTML('beforeend', player);
        document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

        userIdInDisplayFrame = `user-container-${uid}`;
        localScreenTracks.play(`user-${uid}`);

        await client.publish([localScreenTracks]);

        let videoFrames = document.getElementsByClassName('video__container');
        for(let i = 0; i < videoFrames.length; i++){
            if(videoFrames[1].id != userIdInDisplayFrame){
                videoFrames[i].style.height = '100px';
                videoFrames[i].style.width = '100px';
            }
        }
        
    }else{
        sharingScreen = false;
        cameraBtn.style.display = 'inline-block';
        localScreenTracks.stop();
        localScreenTracks.close();
        document.getElementById(`user-container-${uid}`).remove();
        localScreenTracks.removeAllListeners();
        await client.unpublish([localScreenTracks]);

        switchToCamera();
    
    }
}

let leaveStream = async (e) => {

    e.preventDefault();

    document.getElementById('join-btn').style.display = 'block';
    document.getElementsByClassName('stream__actions')[0].style.display = 'none';

    for(let i = 0; i < localTracks.length; i++){
        localTracks[i].stop();
        localTracks[i].close();
    }

    await client.unpublish([localTracks[0], localTracks[1]]);

    if(localScreenTracks){
        await client.unpublish(localScreenTracks);
    }

    document.getElementById(`user-container-${uid}`).remove();

    if(userIdInDisplayFrame === 'user-container-${uid}'){
        displayFrame.style.display = null;

        for(let i = 0; i < videoFrames.length; i++){
            videoFrames[i].style.height = '300px';
            videoFrames[i].style.width = '300px';
        }
    }

    channel.sendMessage({text:JSON.stringify({'type':'user-left', 'uid':uid})});
}


document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('screen-btn').addEventListener('click', toggleScreen);
document.getElementById('join-btn').addEventListener('click', joinStream);
document.getElementById('leave-btn').addEventListener('click', leaveStream);

joinRoomInit();
