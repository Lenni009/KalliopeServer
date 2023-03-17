import React, { useContext, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { WebsocketContext } from '../WebSocket/websocket.js'
// import { Player } from '../Player/player.js'
import { Routes } from 'discord-api-types/v10'
import './dashboard.css'
import genericServer from '../../assets/generic_server.png'
import { Sidebar } from './components/Sidebar/sidebar.js'
import { NowPlaying } from './components/NowPlaying/nowplaying.js'
import { Queue } from './components/Queue/queue.js'
import { MediaSession } from './components/MediaSession/mediasession.js'
import { Start } from './components/Start/start.js'

const playerObject = {
  'guild': '610498937874546699',
  'queue': [],
  'voiceChannel': '658690208295944232',
  'textChannel': '658690163290931220',
  'current': {
    'requester': {
      'displayName': 'Meridian',
      'displayAvatarURL': 'https://cdn.discordapp.com/avatars/360817252158930954/5ca503af7e9f9b64c1eee2d4f947a29d.webp'
    },
    'track': 'QAAAiwIAKEppbSBZb3NlZiB4IFJJRUxMIC0gQW5pbWFsIChMeXJpYyBWaWRlbykACUppbSBZb3NlZgAAAAAAArNoAAtRUVgyaHBtdE1KcwABACtodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PVFRWDJocG10TUpzAAd5b3V0dWJlAAAAAAAAAAA=',
    'title': 'Jim Yosef x RIELL - Animal (Lyric Video)',
    'identifier': 'QQX2hpmtMJs',
    'author': 'Jim Yosef',
    'duration': 177000,
    'isSeekable': true,
    'isStream': false,
    'uri': 'https://www.youtube.com/watch?v=QQX2hpmtMJs',
    'thumbnail': 'https://img.youtube.com/vi/QQX2hpmtMJs/maxresdefault.jpg'
  },
  'paused': false,
  'volume': 50,
  'filter': 'none',
  'position': 0,
  'timescale': 1,
  'repeatMode': 'none'
}

export function Dashboard() {
  document.title = 'Kalliope | Dashboard'

  const websocket = useContext(WebsocketContext)
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')))
  const [player, setPlayer] = useState(null)
  const [clientGuilds, setClientGuilds] = useState({})
  const [activeTab, setActiveTab] = useState(0)
  const [searchParams] = useSearchParams()

  // WebSocket Effect
  useEffect(() => {
    if (!websocket || !user) { return }
    websocket.sendData = (type = 'none', data = {}) => {
      data.type = data.type ?? type
      data.userId = data.userId ?? user.id
      data.guildId = data.guildId ?? player?.guild ?? null
      websocket.send(JSON.stringify(data))
    }

    if (websocket.readyState == 1 && !clientGuilds) { websocket.sendData('requestClientGuilds') }
    websocket.onopen = () => { websocket.sendData('requestClientGuilds') }
    websocket.onclose = () => { console.warn('WebSocket closed.') }
    websocket.onmessage = (message) => {
      const data = JSON.parse(message?.data)
      switch (data.type) {
        case 'clientGuilds': {
          setClientGuilds(data.guilds)
          break
        }
        case 'playerData': {
          setPlayer(data.player)
          break
        }
      }
    }
  }, [websocket, user, player, clientGuilds])
  // Login Effect
  useEffect(() => {
    if (user) {
      history.replaceState(null, '', location.href.split('?')[0])
      return
    }
    const loginUrl = `https://discordapp.com/api/oauth2/authorize?client_id=1053262351803093032&scope=identify%20guilds&response_type=code&redirect_uri=${encodeURIComponent(window.location.origin + '/dashboard')}`

    const code = searchParams.get('code')
    if (!code) {
      window.location.replace(loginUrl)
      return
    }

    async function fetchUser() {
      const body = new URLSearchParams({
        'client_id': '1053262351803093032',
        'client_secret': 'z3rbrd_dNS-sR6JJ3UvciefXljqwqv0o',
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': `${location.origin}/dashboard`
      })

      const token = await fetch('https://discord.com/api' + Routes.oauth2TokenExchange(), {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).then((response) => response.json()).catch((e) => {
        console.error('Error while fetching token while authenticating: ' + e)
      })
      // noinspection JSUnresolvedVariable
      if (!token?.access_token) {
        window.location.replace(loginUrl)
        return
      }

      const discordUser = await fetch('https://discord.com/api' + Routes.user(), {
        method: 'GET',
        headers: { authorization: `${token.token_type} ${token.access_token}` }
      }).then((response) => response.json()).catch((e) => {
        console.error('Error while fetching user while authenticating: ' + e)
      })
      const guilds = await fetch('https://discord.com/api' + Routes.userGuilds(), {
        method: 'GET',
        headers: { authorization: `${token.token_type} ${token.access_token}` }
      }).then((response) => response.json()).catch((e) => {
        console.error('Error while fetching guilds while authenticating: ' + e)
      })
      if (!discordUser || !guilds) {
        window.location.replace(loginUrl)
        return
      }

      discordUser.guilds = guilds
      localStorage.setItem('user', JSON.stringify(discordUser))
      setUser(discordUser)
    }
    fetchUser().catch(() => { window.location.replace(loginUrl) })
  }, [searchParams, user])
  // Scrollable Titles Effect
  useEffect(() => {
    const elements = document.querySelectorAll('.server-card > span')
    elements.forEach((element) => {
      if (element.offsetWidth < element.scrollWidth) {
        element.style.transitionDuration = `${(1 - element.offsetWidth / element.scrollWidth) * 3}s`
        element.onmouseenter = () => { element.style.marginLeft = 2 * (element.offsetWidth - element.scrollWidth) + 'px' }
        element.onmouseleave = () => { element.style.marginLeft = 0 }
      }
    })
  })

  const tabs = [
    <Start key={0}/>,
    <div key={1} className={'flex-container'}>
      <button onClick={() => { setPlayer(playerObject); setActiveTab(2) }}>Server</button>
    </div>,
    <NowPlaying key={2} player={player}/>,
    <Queue key={3} tracks={player?.queue ?? []}/>
  ]

  return (
    <div>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} player={!!player}/>
      <div className={'sidebar-margin'}>{tabs[activeTab]}</div>
      {player ? <MediaSession track={player.current} paused={player.paused}/> : null}
    </div>
  )

  if (player) { return <Player player={player}/> }
  return (
    <div className={'dashboard flex-container column'}>
      <h1><i className={'fas fa-th'}/> Select a server...</h1>
      <div className={'server-container flex-container'}>
        <div className={'server-card flex-container column'}
          onClick={() => { setPlayer(playerObject) }}>
          <img src={genericServer} alt={'Server Icon'}></img>
          <span>Sample guild</span>
        </div>
        {/* eslint-disable-next-line no-extra-parens */}
        {user?.guilds ? user.guilds.map((guild, index) => (
          <div className={'server-card flex-container column'} key={index}
            onClick={() => { websocket.sendData('requestPlayerData', { userId: user.id, guildId: guild.id, clientId: clientGuilds[guild.id] }) }}>
            <img src={guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}?size=1024` : genericServer} alt={'Server Icon'}></img>
            <span>{guild.name}</span>
          </div>
        )) : <div className={'loading-gear'}><i className="fas fa-cog fa-spin"/></div>}
      </div>
      {user ? <div className={'nav-link-container'}>
        <Link to={'/'} className={'logout-button'} onClick={() => { localStorage.removeItem('user') }}>
          <span><i className="far fa-sign-out"/> Logout</span>
        </Link>
      </div> : null}
    </div>
  )
}
