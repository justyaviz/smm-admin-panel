import { useEffect, useState } from "react";
import { api } from "../api";

export default function Notifications() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.notifications().then(setList);
  }, []);

  return (
    <div className="notif">
      {list.map((n) => (
        <div key={n.id} className={n.is_read ? "read" : "unread"}>
          <b>{n.title}</b>
          <p>{n.body}</p>
        </div>
      ))}
    </div>
  );
}
