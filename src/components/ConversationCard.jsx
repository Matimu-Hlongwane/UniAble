function ConversationCard({ messages }) {

  return (
    <div className="conversation-card">

      {messages.map((message, index) => (

        <div
          className="conversation-message"
          key={index}
        >

          <p
            className={
              message.speaker === "UNIABLE"
                ? "conversation-speaker uniable-speaker"
                : "conversation-speaker user-speaker"
            }
          >

            {message.speaker}

          </p>


          <p className="conversation-text">

            {message.text}

          </p>

        </div>

      ))}

    </div>
  );
}

export default ConversationCard;