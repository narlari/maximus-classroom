export type SessionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

export type RealtimeController = {
  stop: () => void;
  sendTextMessage: (text: string) => void;
  speakMessage: (text: string) => void;
};

type ConnectOptions = {
  studentId: string;
  onStatusChange: (status: SessionStatus) => void;
  onError: (message: string) => void;
  onUserTranscript?: (transcript: string) => void;
  onAssistantTranscript?: (transcript: string) => void;
};

type SessionResponse = {
  value?: string;
  expires_at?: number;
  error?: string;
  details?: string;
};

type RealtimeContentPart = {
  transcript?: string;
  text?: string;
};

type RealtimeEventPayload = {
  type?: string;
  transcript?: string;
  text?: string;
  error?: {
    code?: string;
    message?: string;
    type?: string;
    event_id?: string;
  };
  item?: {
    content?: RealtimeContentPart[];
  };
  response?: {
    output?: Array<{
      content?: RealtimeContentPart[];
    }>;
  };
};

export async function connectRealtimeSession(
  options: ConnectOptions,
): Promise<RealtimeController> {
  const audioElement = document.createElement("audio");
  audioElement.autoplay = true;
  let peerConnection: RTCPeerConnection | null = null;
  let mediaStream: MediaStream | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let lastAssistantTranscript = "";

  try {
    options.onStatusChange("connecting");

    const tokenResponse = await fetch("/api/realtime/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId: options.studentId,
      }),
    });

    const tokenData = (await tokenResponse.json()) as SessionResponse;
    const ephemeralKey = tokenData.value;

    if (!tokenResponse.ok || !ephemeralKey) {
      const detail = tokenData.details || tokenData.error || "No token returned by the server.";
      throw new Error(`Unable to start voice session: ${detail}`);
    }

    peerConnection = new RTCPeerConnection();
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    mediaStream.getTracks().forEach((track) => {
      peerConnection?.addTrack(track, mediaStream as MediaStream);
    });

    peerConnection.ontrack = (event) => {
      audioElement.srcObject = event.streams[0];
    };

    peerConnection.onconnectionstatechange = () => {
      if (!peerConnection) {
        return;
      }

      if (peerConnection.connectionState === "connected") {
        options.onStatusChange("listening");
      }

      if (
        peerConnection.connectionState === "failed" ||
        peerConnection.connectionState === "disconnected" ||
        peerConnection.connectionState === "closed"
      ) {
        options.onStatusChange("idle");
      }
    };

    dataChannel = peerConnection.createDataChannel("oai-events");
    dataChannel.addEventListener("message", (event) => {
      let payload: RealtimeEventPayload;

      try {
        payload = JSON.parse(event.data) as RealtimeEventPayload;
      } catch {
        console.error("[Realtime] Invalid data channel payload:", event.data);
        options.onError("Received an unreadable message from the voice session.");
        options.onStatusChange("error");
        return;
      }

      const transcript =
        payload.transcript ??
        payload.text ??
        payload.item?.content?.map((content) => content.transcript ?? content.text ?? "").join(" ").trim() ??
        payload.response?.output
          ?.flatMap((item) => item.content ?? [])
          .map((content) => content.transcript ?? content.text ?? "")
          .join(" ")
          .trim();

      if (
        transcript &&
        (payload.type === "response.audio_transcript.done" ||
          payload.type === "response.output_audio_transcript.done" ||
          payload.type === "response.output_text.done" ||
          payload.type === "response.done") &&
        transcript !== lastAssistantTranscript
      ) {
        lastAssistantTranscript = transcript;
        options.onAssistantTranscript?.(transcript);
      }

      if (transcript && payload.type === "conversation.item.input_audio_transcription.completed") {
        options.onUserTranscript?.(transcript);
      }

      if (
        payload.type === "response.created" ||
        payload.type === "response.output_item.created" ||
        payload.type === "response.output_item.added" ||
        payload.type === "response.content_part.added"
      ) {
        options.onStatusChange("thinking");
        return;
      }

      if (
        payload.type === "output_audio_buffer.started" ||
        payload.type === "response.audio.delta" ||
        payload.type === "response.output_audio.delta" ||
        payload.type === "response.audio_transcript.delta" ||
        payload.type === "response.output_audio_transcript.delta"
      ) {
        options.onStatusChange("speaking");
        return;
      }

      if (
        payload.type === "output_audio_buffer.stopped" ||
        payload.type === "response.audio.done" ||
        payload.type === "response.output_audio.done" ||
        payload.type === "response.done" ||
        payload.type === "input_audio_buffer.committed"
      ) {
        options.onStatusChange("listening");
        return;
      }

      if (payload.type === "error") {
        const errMsg = formatRealtimeError(payload);
        console.error("[Realtime] Error event:", errMsg);
        options.onError(errMsg);
        options.onStatusChange("error");
      }
    });

    dataChannel.addEventListener("error", () => {
      options.onError("The voice session connection ran into a data channel error.");
      options.onStatusChange("error");
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await waitForIceGathering(peerConnection);

    const localSdp = peerConnection.localDescription?.sdp;

    if (!localSdp) {
      throw new Error("Missing local WebRTC offer.");
    }

    const sdpResponse = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
      method: "POST",
      body: localSdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      console.error("[Realtime] SDP exchange failed:", sdpResponse.status, errorText);
      throw new Error(`Unable to connect audio to OpenAI (${sdpResponse.status}): ${errorText}`);
    }

    const answerSdp = await sdpResponse.text();
    console.log("[Realtime] Got SDP answer, length:", answerSdp.length);

    const answer = {
      type: "answer" as RTCSdpType,
      sdp: answerSdp,
    };

    await peerConnection.setRemoteDescription(answer);
    await waitForDataChannelOpen(dataChannel);

    dataChannel.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions:
            "Greet the student warmly as Maximus, introduce yourself as a math tutor, and ask what they want to work on today.",
        },
      }),
    );

    const speakMessage = (text: string) => {
      if (!dataChannel || dataChannel.readyState !== "open") {
        return;
      }

      dataChannel.send(
        JSON.stringify({
          type: "response.create",
          response: {
            modalities: ["audio", "text"],
            instructions: `Say exactly this to the student in a warm, natural way: ${text}`,
          },
        }),
      );
    };

    return {
      stop: () => {
        cleanupConnection({ peerConnection, mediaStream, dataChannel, audioElement });
        options.onStatusChange("idle");
      },
      sendTextMessage: (text: string) => {
        if (!dataChannel || dataChannel.readyState !== "open") {
          return;
        }

        dataChannel.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text,
                },
              ],
            },
          }),
        );

        dataChannel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
              instructions:
                "Respond naturally to the latest whiteboard update. Keep the reply short, supportive, and focused on the student's math work.",
            },
          }),
        );
      },
      speakMessage,
    };
  } catch (error) {
    cleanupConnection({ peerConnection, mediaStream, dataChannel, audioElement });
    throw error;
  }
}

async function waitForIceGathering(peerConnection: RTCPeerConnection) {
  if (peerConnection.iceGatheringState === "complete") {
    return;
  }

  await new Promise<void>((resolve) => {
    const handleStateChange = () => {
      if (peerConnection.iceGatheringState === "complete") {
        peerConnection.removeEventListener("icegatheringstatechange", handleStateChange);
        resolve();
      }
    };

    peerConnection.addEventListener("icegatheringstatechange", handleStateChange);
  });
}

async function waitForDataChannelOpen(dataChannel: RTCDataChannel) {
  if (dataChannel.readyState === "open") {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    dataChannel.addEventListener("open", () => resolve(), { once: true });
    dataChannel.addEventListener("error", () => reject(new Error("Data channel failed to open.")), {
      once: true,
    });
  });
}

function formatRealtimeError(payload: RealtimeEventPayload) {
  const error = payload.error;

  if (!error) {
    return "The voice session returned an unknown error.";
  }

  const detailParts = [error.message, error.code, error.type].filter(Boolean);

  if (detailParts.length === 0) {
    return "The voice session returned an unknown error.";
  }

  return `Voice session error: ${detailParts.join(" | ")}`;
}

function cleanupConnection({
  peerConnection,
  mediaStream,
  dataChannel,
  audioElement,
}: {
  peerConnection: RTCPeerConnection | null;
  mediaStream: MediaStream | null;
  dataChannel: RTCDataChannel | null;
  audioElement: HTMLAudioElement;
}) {
  dataChannel?.close();
  peerConnection?.close();
  mediaStream?.getTracks().forEach((track) => track.stop());

  if (audioElement.srcObject instanceof MediaStream) {
    audioElement.srcObject.getTracks().forEach((track) => track.stop());
  }

  audioElement.srcObject = null;
}
