import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "../config/axios.js";
import {
  initializeSocket,
  sendMessage,
  reciveMessage,
} from "../config/socket.js";
import { UserContext } from "../context/user.context.jsx";
import Markdown from "markdown-to-jsx";
import { use } from "react";

function SyntaxHighlightedCode(props) {
  const ref = useRef(null);
  React.useEffect(() => {
    if (ref.current && props.className?.includes("lang-") && window.hljs) {
      window.hljs.highlightElement(ref.current);
      // hljs won't reprocess the element unless this attribute is removed
      ref.current.removeAttribute("data-highlighted");
    }
  }, [props.className, props.children]);
  return <code {...props} ref={ref} />;
}

const Project = () => {
  const location = useLocation();
  // console.log(location);

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(new Set());
  const [project, setProject] = useState(location.state.project);
  const [message, setMessage] = useState("");
  const { user } = useContext(UserContext);
  const messageBox = React.createRef();

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);

  const handleUserClick = (id) => {
    setSelectedUserId((prevSelectedUserId) => {
      const newSelectedUserId = new Set(prevSelectedUserId);
      if (newSelectedUserId.has(id)) {
        newSelectedUserId.delete(id);
      } else {
        newSelectedUserId.add(id);
      }
      // console.log(Array.from(newSelectedUserId));
      return newSelectedUserId;
    });
  };

  function addCollaborators() {
    console.log("Add Collaborators");

    axios
      .put("/projects/add-user", {
        projectId: location.state.project._id,
        users: Array.from(selectedUserId),
      })
      .then((res) => {
        console.log(res.data);
        setIsModalOpen(false);
      })
      .catch((err) => {
        console.log(err.response.data);
      });
  }

  const send = () => {
    console.log(user);

    sendMessage("project-message", {
      message,
      sender: user,
    });

    setMessages((prevMessages) => {
      const newMessages = [...prevMessages, { sender: user, message }];
      setTimeout(scrollToBottom, 0);
      return newMessages;
    });

    setMessage("");
  };

  useEffect(() => {
    // console.log(location.state.project);

    initializeSocket(project._id);

    reciveMessage("project-message", (data) => {
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages, data];
        setTimeout(scrollToBottom, 0);
        return newMessages;
      });
    });

    axios
      .get(`/projects/get-project/${location.state.project._id}`)
      .then((res) => {
        // console.log(res.data);
        setProject(res.data.project);
      })
      .catch((err) => {
        console.log(err.response.data);
      });

    axios
      .get("/users/all")
      .then((res) => {
        setUsers(res.data.users);
      })
      .catch((err) => {
        console.log(err.response.data);
      });
  }, []);

  function scrollToBottom() {
    messageBox.current.scrollTop = messageBox.current.scrollHeight;
  }

  return (
    <main className="h-screen w-screen flex">
      <section className="left relative flex flex-col h-screen min-w-96 bg-slate-300">
        <header className="flex justify-between items-center p-2 px-4 w-full bg-slate-100 absolute top-0">
          <button className="flex" onClick={() => setIsModalOpen(true)}>
            <i className="ri-user-add-line mr-2"></i>
            <p>Add collaborate</p>
          </button>

          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className="p-2"
          >
            <i className="ri-group-fill"></i>
          </button>
        </header>

        <div className="conversation-area pt-14 flex-grow flex flex-col h-full relative">
          <div
            ref={messageBox}
            className="message-box p-1 flex-grow flex flex-col gap-2 overflow-auto max-h-full scrollbar-hide"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.sender._id === "ai" ? "max-w-80" : "max-w-54" 
                } ${msg.sender._id == user._id.toString() && 'ml-auto' }  message flex flex-col p-2 bg-slate-50 w-fit rounded-md`}
              >
                <small className="opacity-65 text-xs">{msg.sender.email}</small>
                <p className="text-sm">
                  {msg.sender._id === "ai" ? (
                    <div className="overflow-auto bg-slate-950 text-white rounded-sm p-2">
                      <Markdown
                        children={msg.message}
                        options={{
                          overrides: {
                            code: SyntaxHighlightedCode,
                          },
                        }}
                      />
                    </div>
                  ) : (
                    msg.message
                  )}
                </p>
              </div>
            ))}
          </div>
          <div className="inputField bg-slate-100 flex items-center justify-left">
            <div>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="p-2 w-[320px] px-5 border-none outline-none"
                type="text"
                placeholder="Enter Message"
              />
            </div>
            <div>
              <button onClick={send} className="flex-grow p-1 ml-5">
                {/* <i class="ri-send-plane-fill"></i> */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path d="M1.94607 9.31543C1.42353 9.14125 1.4194 8.86022 1.95682 8.68108L21.043 2.31901C21.5715 2.14285 21.8746 2.43866 21.7265 2.95694L16.2733 22.0432C16.1223 22.5716 15.8177 22.59 15.5944 22.0876L11.9999 14L17.9999 6.00005L9.99992 12L1.94607 9.31543Z"></path>
                </svg>{" "}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`sidePanel flex flex-col gap-2 w-full h-full bg-slate-100 absolute transition-all 
            ${isSidePanelOpen ? "translate-x-0" : "-translate-x-full"} top-0`}
        >
          <header className="flex justify-between items-center p-4 px-4 bg-slate-300 ">
            <h1 className="text-xl font-semibold">Collaborators</h1>
            <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}>
              <i className="ri-close-large-fill"></i>
            </button>
          </header>

          <div className="users flex flex-col gap-2">
            {project.users &&
              project.users.map((user) => {
                return (
                  <div
                    key={user._id}
                    className="user cursor-pointer hover:bg-slate-200 p-2 flex gap-2 items-center"
                  >
                    <div className="aspect-square rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-500">
                      <i className="ri-user-fill absolute"></i>
                    </div>
                    <h1 className="font-semibold text-lg">{user.email}</h1>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md w-96 max-w-full relative">
            <header className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Select User</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2">
                <i className="ri-close-fill"></i>
              </button>
            </header>
            <div className="users-list flex flex-col gap-2 mb-16 max-h-96 overflow-auto">
              {users.map((user) => (
                <div
                  key={user._id}
                  className={`user cursor-pointer hover:bg-slate-200 ${
                    Array.from(selectedUserId).indexOf(user._id) != -1
                      ? "bg-slate-200"
                      : ""
                  } p-2 flex gap-2 items-center`}
                  onClick={() => handleUserClick(user._id)}
                >
                  <div className="aspect-square relative rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600">
                    <i className="ri-user-fill absolute"></i>
                  </div>
                  <h1 className="font-semibold text-lg">{user.email}</h1>
                </div>
              ))}
            </div>
            <button
              onClick={addCollaborators}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Add Collaborators
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Project;
