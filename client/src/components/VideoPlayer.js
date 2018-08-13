import React, { Component } from "react";
import io from "socket.io-client";
import { findDOMNode } from "react-dom";
import screenfull from "screenfull";
import ReactPlayer from "react-player";
import moment from "moment";
import { MdVolumeOff, MdVolumeUp, MdRepeat, MdRedo } from "react-icons/md/";
import ReactTooltip from "react-tooltip";
import copyToClipboard from "../helpers/copyToClipboard";

// used to setup the momentduration plugin
require("moment-duration-format");

const endpoint = "http://localhost:4004";
const socket = io(endpoint);

class VideoPlayer extends Component {
  state = {
    url: "https://www.youtube.com/watch?v=nEtOGYDru6E",
    playing: true,
    volume: 0.03,
    muted: false,
    played: 0,
    loaded: 0,
    playbackRate: 1.0,
    loop: false,
    roomID: ""
  };
  componentDidMount() {
    this.setState({
      roomID: window.location.href.substr(
        window.location.href.lastIndexOf("/") + 1
      )
    });
    socket.on("connect", () => {
      socket.emit("join room", {
        roomID: this.state.roomID
      });
    });
    socket.on("seek request", data => {
      this.setState({ seeking: false, played: data });
      this.player.seekTo(data);
      console.log(`seeking to ${data}`);
    });
    socket.on("change url", url => {
      this.setState({ url, playing: true });
    });
    socket.on("sync request", played => {
      this.player.seekTo(parseFloat(played));
    });
    socket.on("playback change", playbackRate => {
      this.setState({ playbackRate });
    });
    socket.on("play request", () => {
      this.setState({ playing: true });
    });
    socket.on("pause request", () => {
      this.setState({ playing: false });
    });
    socket.on("progress request", progress => {
      console.log(progress);
    });
    socket.on("stop request", () => {
      this.setState({ url: null, playing: false });
    });
    socket.on("fast forward", () => {
      this.state.playedSeconds + 10 < this.state.duration
        ? this.setState({ playedSeconds: this.state.playedSeconds + 10 })
        : this.setState({ playedSeconds: this.state.duration });
      this.player.seekTo(this.state.playedSeconds);
    });
    socket.on("rewind", () => {
      this.state.playedSeconds >= 10
        ? this.setState({
            playedSeconds: this.state.playedSeconds - 10
          })
        : this.setState({
            playedSeconds: 0
          });
      this.player.seekTo(this.state.playedSeconds);
    });
  }
  load = url => {
    this.setState({
      url,
      played: 0,
      loaded: 0
    });
  };
  sync = played => {
    this.setState({
      played
    });
  };
  syncRequest = () => {
    socket.emit("sync request", {
      roomID: this.state.roomID,
      played: parseFloat(this.state.played)
    });
  };
  playPause = () => {
    this.setState({ playing: !this.state.playing });
  };
  stop = () => {
    this.setState({ url: null, playing: false });
    socket.emit("stop request", {
      roomID: this.state.roomID
    });
  };
  toggleLoop = () => {
    this.setState({ loop: !this.state.loop });
  };
  setVolume = e => {
    this.setState({ volume: parseFloat(e.target.value) });
  };
  toggleMuted = () => {
    this.setState({ muted: !this.state.muted });
  };
  setPlaybackRate = playbackRate => {
    playbackRate = parseFloat(playbackRate.target.value);
    this.setState({ playbackRate: playbackRate });
    socket.emit("playback change", {
      roomID: this.state.roomID,
      playbackRate: playbackRate
    });
  };
  onPlay = () => {
    console.log("onPlay");
    socket.emit("play request", {
      roomID: this.state.roomID
    });
    this.setState({ playing: true });
  };
  onPause = () => {
    console.log("onPause");
    socket.emit("pause request", {
      roomID: this.state.roomID
    });
    this.setState({ playing: false });
  };
  onSeekMouseDown = e => {
    this.setState({ seeking: true });
  };
  onSeekChange = e => {
    this.setState({ played: parseFloat(e.target.value) });
  };
  onSeekMouseUp = e => {
    this.setState({ seeking: false });
    this.player.seekTo(e.target.value);
    socket.emit("seek request", {
      roomID: this.state.roomID,
      played: parseFloat(e.target.value)
    });
  };
  onProgress = state => {
    console.log("onProgress", state);
    // We only want to update time slider if we are not currently seeking
    if (!this.state.seeking) {
      this.setState(state);
    }
  };
  onEnded = () => {
    console.log("onEnded");
    this.setState({ playing: this.state.loop });
  };
  onDuration = duration => {
    console.log("onDuration", duration);
    this.setState({ duration });
  };
  onClickFullscreen = () => {
    screenfull.request(findDOMNode(this.player));
  };
  renderLoadButton = (url, label) => {
    return <button onClick={() => this.load(url)}>{label}</button>;
  };
  submitURL = e => {
    e.preventDefault();
  };
  ref = player => {
    this.player = player;
  };
  rewind = () => {
    socket.emit("rewind", {
      roomID: this.state.roomID
    });
  };
  fastForward = () => {
    socket.emit("fast forward", {
      roomID: this.state.roomID
    });
  };
  componentWillUnmount() {
    socket.removeAllListeners();
  }
  render() {
    const {
      url,
      playing,
      volume,
      muted,
      loop,
      played,
      loaded,
      playbackRate
    } = this.state;
    return (
      <div className="video-player">
        <section className="section">
          <h1>ReactPlayer Demo</h1>
          <div className="player-wrapper">
            <ReactPlayer
              width="100%"
              height="100%"
              ref={this.ref}
              className="react-player"
              url={url}
              playing={playing}
              loop={loop}
              playbackRate={playbackRate}
              volume={volume}
              muted={muted}
              onReady={() => console.log("onReady")}
              onStart={() => console.log("onStart")}
              onPlay={this.onPlay}
              onPause={this.onPause}
              onBuffer={() => console.log("onBuffer")}
              onSeek={e => console.log("onSeek", e)}
              onEnded={this.onEnded}
              onError={e => console.log("onError", e)}
              onProgress={this.onProgress}
              onDuration={this.onDuration}
            />
          </div>
          <table id="controls">
            <tbody>
              <tr>
                <th>Controls</th>
                <td>
                  <button
                    data-tip
                    data-for="stop-tooltip"
                    className="btn stop"
                    onClick={this.stop}
                  >
                    Stop
                  </button>
                  <ReactTooltip id="stop-tooltip" place="bottom">
                    <span>Stops and clears out the queue</span>
                  </ReactTooltip>
                  <button
                    data-tip
                    data-for="play-pause-tooltip"
                    className="btn pp"
                    onClick={this.playPause}
                  >
                    {playing ? "Pause" : "Play"}
                  </button>
                  <ReactTooltip id="play-pause-tooltip" place="bottom">
                    {playing === true ? (
                      <span>Pauses the video</span>
                    ) : (
                      <span>Plays the video</span>
                    )}
                  </ReactTooltip>
                  <button
                    data-tip
                    data-for="fullscreen-tooltip"
                    className="btn fs"
                    onClick={this.onClickFullscreen}
                  >
                    Fullscreen
                  </button>
                  <ReactTooltip id="fullscreen-tooltip" place="bottom">
                    <span>Makes the video fullscreen</span>
                  </ReactTooltip>
                  <button
                    data-tip
                    data-for="playback-1"
                    className="btn playback"
                    onClick={this.setPlaybackRate}
                    value={1}
                  >
                    1
                  </button>
                  <ReactTooltip id="playback-1" place="bottom">
                    <span>Play at normal speed</span>
                  </ReactTooltip>
                  <button
                    data-tip
                    data-for="playback-1.5"
                    className="btn playback"
                    onClick={this.setPlaybackRate}
                    value={1.5}
                  >
                    1.5
                  </button>
                  <ReactTooltip id="playback-1.5" place="bottom">
                    <span>Play at 1.5x speed</span>
                  </ReactTooltip>
                  <button
                    data-tip
                    data-for="playback-2"
                    className="btn playback"
                    onClick={this.setPlaybackRate}
                    value={2}
                  >
                    2
                  </button>
                  <ReactTooltip id="playback-2" place="bottom">
                    <span>Play at 2x speed</span>
                  </ReactTooltip>
                  <button
                    data-tip
                    data-for="sync-play"
                    className="btn sync"
                    onClick={this.sync && this.syncRequest}
                  >
                    Sync
                  </button>
                  <ReactTooltip id="sync-play" place="bottom">
                    <span>Sync all viewers to your position</span>
                  </ReactTooltip>
                  <button
                    data-tip
                    data-for="fast-forward"
                    className="btn ff"
                    onClick={this.fastForward}
                  >
                    >>
                  </button>
                  <ReactTooltip id="fast-forward" place="bottom">
                    <span>Skip ahead 10 seconds</span>
                  </ReactTooltip>
                  <button
                    data-tip
                    data-for="rewind-tooltip"
                    className="btn rewind"
                    onClick={this.rewind}
                  >{`<<`}</button>
                  <ReactTooltip id="rewind-tooltip" place="bottom">
                    <span>Rewind 10 seconds</span>
                  </ReactTooltip>
                </td>
              </tr>
              <tr>
                <th>Seek</th>
                <td>
                  <input
                    data-tip
                    data-for="seek-tooltip"
                    type="range"
                    min={0}
                    max={1}
                    step="any"
                    value={played}
                    onMouseDown={this.onSeekMouseDown}
                    onChange={this.onSeekChange}
                    onMouseUp={this.onSeekMouseUp}
                  />
                  <ReactTooltip id="seek-tooltip" place="bottom">
                    <span>{Math.ceil(played * 100)}%</span>
                  </ReactTooltip>
                  {moment
                    .duration(this.state.playedSeconds, "seconds")
                    .format("hh:mm:ss")}{" "}
                  /{" "}
                  {moment
                    .duration(this.state.duration, "seconds")
                    .format("hh:mm:ss")}
                </td>
              </tr>
              <tr>
                <th>Volume</th>
                <td>
                  <input
                    data-tip
                    data-for="volume-tooltip"
                    type="range"
                    min={0}
                    max={1}
                    step="any"
                    value={volume}
                    onChange={this.setVolume}
                  />
                  <ReactTooltip id="volume-tooltip" place="bottom">
                    <span>{Math.ceil(volume * 100)}%</span>
                  </ReactTooltip>
                  {Math.round(volume * 100)}
                </td>
              </tr>
              <tr>
                <th>
                  <label htmlFor="muted">Muted</label>
                </th>
                <td>
                  {muted && (
                    <div>
                      <MdVolumeOff
                        data-tip
                        data-for="muted"
                        onClick={this.toggleMuted}
                      />
                      <ReactTooltip id="muted" place="right">
                        <span>muted</span>
                      </ReactTooltip>
                    </div>
                  )}
                  {!muted && (
                    <div>
                      <MdVolumeUp
                        data-tip
                        data-for="on"
                        onClick={this.toggleMuted}
                      />
                      <ReactTooltip id="on" place="right">
                        <span>on</span>
                      </ReactTooltip>
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <th>
                  <label htmlFor="loop">Loop</label>
                </th>
                <td>
                  {loop && (
                    <div>
                      <MdRepeat
                        data-tip
                        data-for="looping"
                        onClick={this.toggleLoop}
                      />
                      <ReactTooltip id="looping" place="right">
                        <span>looping</span>
                      </ReactTooltip>
                    </div>
                  )}
                  {!loop && (
                    <div>
                      <MdRedo
                        data-tip
                        data-for="no-repeat"
                        onClick={this.toggleLoop}
                      />
                      <ReactTooltip id="no-repeat" place="right">
                        <span>no repeat</span>
                      </ReactTooltip>
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <th>Played</th>
                <td>
                  <progress data-tip data-for="played" max={1} value={played} />
                  <ReactTooltip id="played" place="right">
                    <span>{`${Math.ceil(played * 100)}%`}</span>
                  </ReactTooltip>
                </td>
              </tr>
              <tr>
                <th>Loaded</th>
                <td>
                  <progress data-tip data-for="loaded" max={1} value={loaded} />
                  <ReactTooltip id="loaded" place="right">
                    <span>{`${Math.ceil(loaded * 100)}%`}</span>
                  </ReactTooltip>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <tr>
          <th>Custom URL</th>
          <td>
            <input
              data-tip
              data-for="custom-url-tooltip"
              ref={input => {
                this.urlInput = input;
              }}
              type="text"
              placeholder="Enter URL"
            />
            <ReactTooltip id="custom-url-tooltip" place="right">
              <span>Change the playing video with a custom URL</span>
            </ReactTooltip>
            <button
              onClick={() => {
                socket.emit("change url", {
                  roomID: this.state.roomID,
                  url: this.urlInput.value
                });
              }}
            >
              Load
            </button>
          </td>
          <td>
            <button
              className="btn"
              data-tip
              data-for="room-location"
              id="room-location"
              onClick={() => {
                copyToClipboard(window.location.href);
              }}
            >
              Click me to copy your url
            </button>
            <ReactTooltip id="room-location" place="bottom">
              Copied
            </ReactTooltip>
          </td>
        </tr>
      </div>
    );
  }
}

export default VideoPlayer;
