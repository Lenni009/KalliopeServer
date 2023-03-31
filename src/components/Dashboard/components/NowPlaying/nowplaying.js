// noinspection JSUnresolvedVariable

import React, { useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { WebsocketContext } from '../../../WebSocket/websocket.js'
import { Thumbnail } from '../Thumbnail/thumbnail.js'
import { FastAverageColor } from 'fast-average-color'
import './nowplaying.css'

function msToHMS(ms) {
  let totalSeconds = ms / 1000
  const hours = Math.floor(totalSeconds / 3600).toString()
  totalSeconds %= 3600
  const minutes = Math.floor(totalSeconds / 60).toString()
  const seconds = Math.floor(totalSeconds % 60).toString()
  return hours === '0' ? `${minutes}:${seconds.padStart(2, '0')}` : `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`
}

export function NowPlaying({ player }) {
  const websocket = useContext(WebsocketContext)
  const [position, setPosition] = useState(player?.position ?? 0)
  useEffect(() => {
    if (!player?.current) { return }
    setPosition(player.position)
    const interval = setInterval(() => {
      if (!player.paused) {
        setPosition((prevPosition) => {
          if (prevPosition >= player.current.duration) {
            clearInterval(interval)
            return player.current.duration
          }
          return prevPosition + 1000
        })
      }
    }, 1000 * (1 / player.timescale ?? 1))
    return () => { clearInterval(interval) }
  }, [player])
  const [volume, setVolume] = React.useState(player?.volume ?? 50)
  useEffect(() => {
    const slider = document.querySelector('.volume-slider-input')
    if (!slider) { return }

    const container = document.querySelector('.volume-slider-container')
    slider.ontouchstart = () => { container.classList.add('active') }
    slider.ontouchend = () => { container.classList.remove('active') }
  }, [])
  useEffect(() => {
    if (!player?.current?.thumbnail) { return }
    const fac = new FastAverageColor()
    fetch(window.location.origin + '/cors?url=' + encodeURIComponent(player.current.thumbnail)).then((response) => response.blob()).then((image) => {
      fac.getColorAsync(window.URL.createObjectURL(image), { algorithm: 'dominant', ignoredColor: [[0, 0, 0, 255, 50], [255, 255, 255, 255, 25]] }).then((color) => {
        document.querySelector('.now-playing-container').style.setProperty('--dominant-color', color.hex)
      }).catch((e) => {
        console.warn(e.message)
      })
    })
    return () => { fac.destroy() }
  }, [player])

  if (!player?.current) { return <div className={'now-playing-container flex-container'}>Nothing currently playing! Join a voice channel and start playback using &apos;/play&apos;!</div> }
  return (
    <div className={'now-playing-container flex-container column'}>
      <Thumbnail image={player.current.thumbnail} size={'35vh'}/>
      <div className={'flex-container nowrap'}>
        <span>{msToHMS(position)}</span>
        <div className={'progress-container'}>
          <div className={'progress-bar'} style={{ width: `${player.current.isStream ? '100%' : position / player.current.duration * 100 + '%'}` }}/>
        </div>
        <span>{!player.current.isStream ? msToHMS(player.current.duration) : '🔴 Live'}</span>
      </div>
      <div className={'flex-container column'}>
        <a href={player.current.uri} rel='noreferrer' target='_blank'><b>{player.current.title}</b></a>
        <span>{player.current.author}</span>
      </div>
      <div className={'music-buttons flex-container nowrap'}>
        <button onClick={() => { websocket.sendData('shuffle') }}><i className={'fas fa-random'}/></button>
        <button onClick={() => { websocket.sendData('previous') }}><i className={'fas fa-angle-left'}/></button>
        <button onClick={() => { websocket.sendData('pause') }}><i className={player.paused ? 'fas fa-play' : 'fas fa-pause'}/></button>
        <button onClick={() => { websocket.sendData('skip') }}><i className={'fas fa-angle-right'}/></button>
        <button onClick={() => { websocket.sendData('repeat') }}><i className={player.repeatMode === 'none' ? 'fad fa-repeat-alt' : player.repeatMode === 'track' ? 'fas fa-repeat-1-alt' : 'fas fa-repeat'}/></button>
      </div>
      <div className={'flex-container column'}>
        <div className={'volume-slider-container'}>
          <input className={'volume-slider-input'} type={'range'} defaultValue={volume.toString()} step={'1'} min={'0'} max={'100'} onInput={(event) => { setVolume(event.target.value) }} onMouseUp={(event) => { websocket.sendData('volume', { volume: event.target.value }) }}/>
          <div className={'volume-slider-range'} style={{ width: `${100 - volume}%`, borderRadius: volume == 0 ? '5px' : '0 5px 5px 0' }}></div>
        </div>
        <div className={'volume-display'}><i className={volume === 0 ? 'fas fa-volume-off' : volume <= 33 ? 'fas fa-volume-down' : volume <= 66 ? 'fas fa-volume' : 'fas fa-volume-up'}/> {volume}</div>
      </div>
    </div>
  )
}

NowPlaying.propTypes = { player: PropTypes.object }