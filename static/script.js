let currentUser = null;
let selectedChannel = null;
let currentUserId = null;

const fetchChannelsFromServer = async () => {
  const response = await fetch("http://localhost:3000/api/channels");
  const channels = await response.json();

  channels.forEach((channel) => {
    const isPublic = channel.status.toLowerCase() === "public";
    buildChannelListViaTemplate(
      channel.channelName,
      isPublic,
      channel.channelID
    );
  });
};

const resetChannels = () => {
  const channelsList = document.querySelector(".channelContainer");
  channelsList.innerHTML = "";
};

const addNewChannelButton = document.querySelector("#addNewChannel");

addNewChannelButton.addEventListener("click", () => {
  createChannel();
});

const createChannel = () => {
  const newChannelInput = document.querySelector(".newChannel");
  const privateCheckbox = document.querySelector("#private");

  const channelName = newChannelInput.value;
  let status;
  if (privateCheckbox.checked === false) {
    status = "public";
  } else {
    status = "private";
  }

  fetch("/api/createChannel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelName, status }),
  })
    .then((data) => {
      console.log("Channel created successfully", data);
      resetChannels();
      fetchChannelsFromServer();
    })
    .catch((error) => {
      console.error("Error creating channel", error);
    });
};

const fetchUserNameFromUuid = async (uuid) => {
  const response = await fetch(`http://localhost:3000/api/getUUID/${uuid}`);
  const user = await response.json();
  return user.username;
};

const fetchChannelMessages = async (channelID) => {
  let response = null;
  try {
    response = await fetch(`http://localhost:3000/api/messages/${channelID}`);
  } catch {
    console.log(response);
  }
  const channelMessages = await response.json();

  const messages = channelMessages;
  messages.forEach(async (item) => {
    const { message, timestamp, uuid, messageid, deleted } = item;
    const username = await fetchUserNameFromUuid(uuid);
    buildMessageChatViaTemplate(message, timestamp, uuid, username, messageid);
    console.log("msgID", messageid);
  });
};

const deleteMessageHandler = async (event) => {
  const messageId = event.target.getAttribute("data-id");
  const messageAuthor = event.target.getAttribute("data-author");
  const token = localStorage.getItem("token");
  const messageUuid = Number.parseInt(messageAuthor);
  console.log(typeof currentUserId, typeof messageUuid);
  console.log(currentUserId, messageUuid);

  if (currentUserId !== messageUuid) {
    console.log("You do not have permission to delete this message");
    return;
  }
  const response = await fetch(`/api/deleteMessage/${messageId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  console.log(response);
  if (response.status === 200) {
    console.log(selectedChannel);
    console.log(typeof selectedChannel);
    clearMessageContainer();
    await fetchChannelMessages(selectedChannel);
  } else {
    console.log("Failed to delete message");
  }
};

const isLoggedIn = () => {
  if (currentUser != null) {
    return true;
  } else {
    return false;
  }
};

const setSelectedChannel = (channelId) => {
  selectedChannel = channelId;
  fetchChannelMessages(selectedChannel);
};

const updateChannelHeader = (channelName) => {
  const channelHeader = document.querySelector("#right-heading");
  if (channelName) {
    channelHeader.innerText = `Channel: ${channelName}`;
  } else {
    channelHeader.innerText = " ";
  }
};

const selectChannelHandler = (event) => {
  clearMessageContainer();
  const target = event.target;
  const channel_id = target.getAttribute("data-id");
  const channel_name = target.getAttribute("data-name");
  const channel_status = target.getAttribute("data-status");
  const channelIsPublic = channel_status.toLowerCase() === "true";
  console.log(channel_name);
  const channelWrapperButtons = document.querySelectorAll(".wrapButton");
  channelWrapperButtons.forEach((button) => {
    button.classList.remove("selected");
  });

  target.classList.add("selected");

  const userIsLoggedIn = currentUser !== null;
  if (userIsLoggedIn || channelIsPublic) {
    setSelectedChannel(channel_id);
    updateChannelHeader(channel_name);
  } else {
    console.log("Not allowed to view contents of channel");
  }
};

const clearMessageContainer = () => {
  const message_container = document.querySelector(".messageContainer");
  message_container.innerHTML = "";
};

const getUserUUID = async (username) => {
  const response = await fetch(`/api/getUser/${username}`);
  if (!response.status === 200) {
    console.error("Error: Could not fetch user data");
    return;
  }
  const user = await response.json();
  return user.uuid;
};

const postMessage = async () => {
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

async function verifyToken() {
  const token = localStorage.getItem("jwt");
  console.log("TOKEN", token);
  if (!token) return;
  console.log("VERIFY TOKEN");
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  console.log("verify token");
  const response = await fetch("/api/verifyToken", options);
  if (response.status === 200) {
    console.log("verify token 200");

    const user = await response.json();

    const uuid = await getUserUUID(user.username);

    console.log(user);
    currentUser = user.username;
    currentUserId = uuid;
    changeTextAndHideInputs(user.username);
  }
}

async function changeTextAndHideInputs(currentUser) {
  const welcomeText = document.querySelector(".welcomeText");
  console.log(welcomeText);

  welcomeText.innerText = "Welcome, " + currentUser;

  const loginInput = document.querySelector(".login");
  const passwordInput = document.querySelector(".password");
  const signIn = document.querySelector(".signIn");
  const signUp = document.querySelector(".signUp");
  const logout = document.querySelector(".logout");

  loginInput.style.display = "none";
  passwordInput.style.display = "none";
  signIn.style.display = "none";
  signUp.style.display = "none";
  logout.style.display = "block";
}

function showLoginButtons() {
  const loginInput = document.querySelector(".login");
  const passwordInput = document.querySelector(".password");
  const signIn = document.querySelector(".signIn");
  const signUp = document.querySelector(".signUp");
  const logout = document.querySelector(".logout");

  loginInput.style.display = "block";
  passwordInput.style.display = "block";
  signIn.style.display = "block";
  signUp.style.display = "block";
  logout.style.display = "none";
}

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
      const nameToken = await response.json();
      localStorage.setItem("jwt", nameToken.token);
      console.log("i LOGIN", nameToken.token);
      currentUser = username;
      verifyToken();
    } else if (response.status === 400) {
      console.error("Bad request: missing or incorrect input");
    } else if (response.status === 401) {
      console.error("Unauthorized: incorrect password");
    }
  }
  document.querySelector(".signIn").addEventListener("click", login);
});

document.addEventListener("DOMContentLoaded", async function () {
  await verifyToken();
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
    console.log("respons.status", response.status);
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

  if (isPublic) {
    channel_status.innerText = "";
  }

  channel_name.innerText = text;
  channel_wrap_button.setAttribute("data-id", channelID);
  channel_status.setAttribute("data-id", channelID);
  channel_name.setAttribute("data-id", channelID);
  channel_name.setAttribute("data-name", text);

  channel_wrap_button.setAttribute("data-status", isPublic);
  channel_status.setAttribute("data-status", isPublic);
  channel_name.setAttribute("data-status", isPublic);

  channel_wrap_button.addEventListener("click", selectChannelHandler);
  channelContainer.appendChild(clone);
};

const buildMessageChatViaTemplate = (
  text,
  timeStamp,
  uuid,
  username,
  messageId,
  editedTimestamp
) => {
  const messageContainer = document.querySelector(".messageContainer");
  const template = document.querySelector("#messageTemplate");
  const clone = template.content.cloneNode(true);
  const message_text = clone.querySelector(".message");
  const username_text = clone.querySelector(".username");
  const message_timestamp = clone.querySelector(".timeStamp");
  const deleteButton = clone.querySelector(".deleteMsgBtn");

  message_text.innerText = ": " + text;
  username_text.innerText = username;

  if (editedTimestamp) {
    message_timestamp.innerText = `Edited ${new Date(
      editedTimestamp
    ).toLocaleString()}`;
  } else {
    message_timestamp.innerText = timeStamp;
  }

  deleteButton.setAttribute("data-author", uuid);
  if (messageId) {
    deleteButton.setAttribute("data-id", messageId);
    deleteButton.addEventListener("click", deleteMessageHandler);
  } else {
    deleteButton.style.display = "none";
  }

  messageContainer.appendChild(clone);
};

/* const buildMessageChatViaTemplate = (
  text,
  timeStamp,
  username,
  messageId,
  deleted
) => {
  const messageContainer = document.querySelector(".messageContainer");
  const template = document.querySelector("#messageTemplate");
  const clone = template.content.cloneNode(true);
  const message_text = clone.querySelector(".message");
  const username_text = clone.querySelector(".username");
  const message_timestamp = clone.querySelector(".timeStamp");
  const deleteButton = clone.querySelector(".deleteMsgBtn");

  message_text.innerText = ": " + text;
  username_text.innerText = username;
  message_timestamp.innerText = timeStamp;

  if (messageId) {
    deleteButton.setAttribute("data-id", messageId);
    deleteButton.addEventListener("click", deleteMessageHandler);
  }
  if (deleted) {
    message_text.innerText = "Message deleted";
  }
  messageContainer.appendChild(clone);
}; */

const logout = () => {
  localStorage.removeItem("jwt");
  currentUser = null;
  changeTextAndHideInputs("Guest");
  showLoginButtons();
  // Se till att den säger "guest" istället för null samt ändrar tillbaka så inloggning är möjligt.
};

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".logout").addEventListener("click", logout);
});

window.addEventListener("load", () => {
  console.log("ON LOAD");

  fetchChannelsFromServer();
});
