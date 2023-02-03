let currentUser = null;
let selectedChannel = null;

const fetchChannelsFromServer = async () => {
  const response = await fetch("http://localhost:3000/api/channels");
  const channels = await response.json();

  console.log(channels);
  channels.forEach((channel) => {
    console.log(channel.status.toLowerCase());
    const isPublic = channel.status.toLowerCase() === "public";
    buildChannelListViaTemplate(
      channel.channelName,
      isPublic,
      channel.channelID
    );
  });
};

const fetchUserNameFromUuid = async (uuid) => {
  const response = await fetch(`http://localhost:3000/api/getUUID/${uuid}`);
  const user = await response.json();
  return user.username;
};

const fetchChannelMessages = async (channelID) => {
  const response = await fetch(
    `http://localhost:3000/api/messages/${channelID}`
  );
  const channelMessages = await response.json();

  const messages = channelMessages;
  messages.forEach(async (item) => {
    const { message, timestamp, uuid } = item;
    const username = await fetchUserNameFromUuid(uuid);
    buildMessageChatViaTemplate(message, timestamp, username);
  });
};

const selectChannelHandler = (event) => {
  console.log("-------------");
  clearMessageContainer();
  const target = event.target;
  const channel_id = target.getAttribute("data-id");
  const channel_status = target.getAttribute("data-status");
  const channelIsPublic = channel_status.toLowerCase() === "true";

  /* const messages = await loadChannelMessages(channel_id); */
  // Tabort "selected" från alla klasser
  const channelWrapperButtons = document.querySelectorAll(".wrapButton");
  channelWrapperButtons.forEach((button) => {
    button.classList.remove("selected");
  });

  // "Lägg till" selected class till den kanal man markerar
  target.classList.add("selected");

  // Ladda in meddelanden på specifikt kanal-id
  selectedChannel = target.getAttribute("data-id");
  const userIsLoggedIn = currentUser !== null;
  if (userIsLoggedIn) {
    fetchChannelMessages(selectedChannel);
  }
  if (!userIsLoggedIn && channelIsPublic) {
    fetchChannelMessages(selectedChannel);
  }
  if (!userIsLoggedIn && !channelIsPublic) {
    console.log("Not allowed to view contents of channel");
  }
};

const clearMessageContainer = () => {
  const message_container = document.querySelector(".messageContainer");
  message_container.innerHTML = "";
};

async function getUserUUID(username) {
  console.log("username is getuserUUID:", username);
  const response = await fetch(`/api/getUser/${username}`);
  if (!response.ok) {
    console.error("Error: Could not fetch user data");
    return;
  }
  const user = await response.json();
  return user.uuid;
}

const postMessage = async () => {
  //const username = prompt("Enter your username:");
  if (!currentUser) {
    console.error("Error: User is not logged in. Please log in first.");
    return;
  }

  const uuid = await getUserUUID(currentUser);
  if (!uuid) {
    console.error("Error: uuid is undefined. Could not retrieve user id");
    return;
  }
  console.log("currentUser", currentUser);
  console.log("uuid", uuid);

  const message = document.querySelector(".messageInput");
  const channelName = document.querySelector(".channelName");
  const dataID = selectedChannel;
  const body = {
    channel_id: dataID,
    uuid: uuid,
    message: message.value,
  };

  const response = await fetch("/api/newMessage", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status === 201) {
    clearMessageContainer();
    await fetchChannelMessages(selectedChannel);
  } else {
    console.error("Error posting message");
  }
};

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".messageSend").addEventListener("click", function () {
    postMessage();
  });
});

// ÅTERKOM TILL DENNA NÄR LOGIN / CREATE USER FUNGERAR.
document.addEventListener("DOMContentLoaded", function () {
  async function login() {
    const username = document.querySelector(".login").value;
    const password = document.querySelector(".password").value;

    console.log("username: ", username);
    console.log("password:", password);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: username, password: password }),
    });
    console.log(response);

    if (response.status === 200) {
      const nameToken = await response.text();
      //spara ner username i global variabel
      currentUser = username;
      // Do something with the token, like storing it in local storage
      localStorage.setItem("nameToken", nameToken);
    } else if (response.status === 400) {
      // Show an error message to the user that the input is missing or incorrect
      console.error("Bad request: missing or incorrect input");
    } else if (response.status === 401) {
      // Show an error message to the user that the password is incorrect
      console.error("Unauthorized: incorrect password");
    }
  }

  // Attach the login function to the button click event

  document.querySelector(".signIn").addEventListener("click", login);
});

document.addEventListener("DOMContentLoaded", function () {
  async function createNewUser() {
    const username = document.querySelector(".login").value;
    const password = document.querySelector(".password").value;

    const response = await fetch("/api/newUser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: username, password: password }),
    });

    if (response.status === 201) {
      console.log("New user created successfully!");
    } else if (response.status === 400) {
      console.error("Bad request: missing or incorrect input");
    } else {
      console.error("An error occurred while creating the new user");
    }
  }

  document.querySelector(".signUp").addEventListener("click", createNewUser);
});

const buildChannelListViaTemplate = (text, isPublic, channelID) => {
  const channelContainer = document.querySelector(".channelContainer");
  const template = document.querySelector("#channelTemplate");
  const clone = template.content.cloneNode(true);
  const channel_name = clone.querySelector(".channelName");
  const channel_status = clone.querySelector(".status");
  const channel_wrap_button = clone.querySelector(".wrapButton");
  console.log("is it public eller?", isPublic);
  if (isPublic) {
    channel_status.innerText = "";
  }

  channel_name.innerText = text;
  channel_wrap_button.setAttribute("data-id", channelID);
  channel_status.setAttribute("data-id", channelID);
  channel_name.setAttribute("data-id", channelID);

  channel_wrap_button.setAttribute("data-status", isPublic);
  channel_status.setAttribute("data-status", isPublic);
  channel_name.setAttribute("data-status", isPublic);

  channel_wrap_button.addEventListener("click", selectChannelHandler);
  channelContainer.appendChild(clone);
  console.log("channelwrap: ", channel_wrap_button);
};

const buildMessageChatViaTemplate = (text, timeStamp, username) => {
  const messageContainer = document.querySelector(".messageContainer");
  const template = document.querySelector("#messageTemplate");
  const clone = template.content.cloneNode(true);
  const message_text = clone.querySelector(".message");
  const username_text = clone.querySelector(".username");
  const message_timestamp = clone.querySelector(".timeStamp");

  message_text.innerText = ": " + text;
  username_text.innerText = username;
  message_timestamp.innerText = timeStamp;
  messageContainer.appendChild(clone);
};

window.addEventListener("load", () => {
  fetchChannelsFromServer();
});
