import ContentType from '@/types/ContentType'
import File from '@/types/File'
import MessageCommands from '@/types/MessageCommands'
import MessageDownload from '@/types/message-received/MessageDownload'
import MessageListFiles from '@/types/message-received/MessageListFiles'
import MessageReceived from '@/types/message-received/MessageReceived'
import MessageSent from '@/types/MessageSent'
import MessageTypes from '@/types/MessageTypes'

import { extensionsDictionary } from '@/utils/extensionsDictionary'
import base64ToArrayBuffer from '@/utils/helpers/base64ToArrayBuffer'

import { Buffer } from 'buffer'
import i18n from '@/i18n'

const extensionsDict = extensionsDictionary(i18n.global.t)
const defaultExtensionName = i18n.global.t('dashboard.files')

export class WebSocketService {
  fileList = [] as File[]
  wsOnMessageListeners: ((obj: MessageReceived) => void)[] = []
  wsOnErrorListener: (() => void)[]= []

  private ws: WebSocket | undefined
  private passCode: number | undefined
  private isConnected = false
  private wsOnMessageListenersListFiles: ((listFiles: File[]) => void) | null = null
  private isMessageReceived = false
  private errorTimeout: string | number | NodeJS.Timeout | undefined

  get isConnectedValue() {
    return this.isConnected
  }

  onOpen = () => {
    console.log('WS opened')
    this.sendMsgToWs({
      type: MessageTypes.LOGGING_WITH_CODE,
      code: this.passCode,
    })
  }

  onMessage = (event: MessageEvent<string>) => {
    this.isMessageReceived = true
    this.parseMessage(JSON.parse(event.data))
  }

  onError = (error: Event) => {
    this.wsOnErrorListener.forEach(listener => listener())
    console.log(error)
    this.ws?.close()
    clearTimeout(this.errorTimeout)
  }

  onClose = (event: Event) => {
    console.log('socket closed' + JSON.stringify(event))
    clearTimeout(this.errorTimeout)
  }
  
  login(passCode: number, errorMethod: () => void) {
    this.wsOnErrorListener = []
    this.wsOnErrorListener.push(errorMethod)
    this.passCode = passCode

    this.ws = new WebSocket('wss://cloudon.cc:9292/')
    this.ws.onopen = this.onOpen
    this.ws.onmessage = this.onMessage
    this.ws.onerror = this.onError
    this.ws.onclose = this.onClose
  }

  downloadFile(fileName: string) {
    this.sendMsgToWs({
      type: MessageTypes.FORWARD,
      command: MessageCommands.DOWNLOAD,
      path: fileName,
    })
  }

  deleteFile(fileName: string) {
    this.sendMsgToWs({
      type: MessageTypes.FORWARD,
      command: MessageCommands.REMOVE,
      path: fileName,
    })
    this.wsListFiles()
  }

  sendFile(file: File, errorMethod: () => void) {
    this.executeErrorWhenNoResponseFromServer()
    this.isMessageReceived = false
    this.wsOnErrorListener = []
    this.wsOnErrorListener.push(errorMethod)

    const reader: FileReader = new FileReader()
    const blob = new Blob([file as unknown as BlobPart], { type: ContentType.OCTET_STREAM })
    reader.readAsArrayBuffer(blob)
        
    reader.onloadend = () => {
      if (reader.readyState === FileReader.DONE) {
        const data = reader.result as string
        const base64String = Buffer.from(data).toString('base64')
        this.wsUploadFile(file.name, file.size, base64String)
      }
    }
  }
  
  disconnect() {
    this.ws?.close()
  }

  addWsOnMessageListener( listenerFunction: ((obj: MessageReceived) => void) ) {
    this.wsOnMessageListeners.push(listenerFunction)
  }

  private sendMsgToWs(msg: MessageSent) {
    this.executeErrorWhenNoResponseFromServer()
    this.isMessageReceived = false
    this.ws?.send(JSON.stringify(msg))
  }

  private executeErrorWhenNoResponseFromServer(){
    this.errorTimeout = setTimeout(() => {
      if(!this.isMessageReceived) {
        this.wsOnErrorListener.forEach(listener => listener())
      }
    }, 8000)
  }

  private getFileType(fileName: string) {
    const extensionMatch = /\.([^.]+)$/.exec(fileName)
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : ''

    for (const [type, extensions] of Object.entries(extensionsDict)) {
      if (extensions.includes(extension)) {
        return type
      }
    }

    return defaultExtensionName
  }

  private parseListFiles(obj: { payload: File[] }) {
    this.fileList = obj.payload.map(file => {
      return {
        ...file,
        type: this.getFileType(file.filename)
      }
    })

    if (this.wsOnMessageListenersListFiles) {
      this.wsOnMessageListenersListFiles(this.fileList)
    }
  }

  private saveByteArray(fileName: string | undefined, decodedBytes: Uint8Array) {
    const mimeType = ContentType.OCTET_STREAM
    const blob = new Blob([decodedBytes], { type: mimeType })
    let link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)

    if(fileName) {
      link.download = fileName
      link.click()
    }
  }

  private isFileArray(files: File | File[]): files is File[] {
    return Array.isArray(files)
  }

  private onDownloadedFileFromPhone(message: MessageDownload) {
    if(message.payload) {
      if(this.isFileArray(message.payload)) {
        message.payload.forEach(file => {
          this.saveByteArray(file.filename, base64ToArrayBuffer(file.bytes))
        })
      } else {
        this.saveByteArray(message.payload.filename, base64ToArrayBuffer(message.payload.bytes))
      }
    }
  }

  private parseMessage(receivedMessage: MessageReceived ) {
    if (receivedMessage.type === MessageTypes.LOGGING_WITH_CODE) {
      if (this.wsOnMessageListeners) {
        this.isConnected = true
        this.wsOnMessageListeners.forEach(listener => {
          listener(receivedMessage)
        })
      }
    }

    const messageCommand: MessageCommands | undefined = receivedMessage.command

    switch (messageCommand) {
    case MessageCommands.DOWNLOAD:
      let messageDownload = receivedMessage as MessageDownload
      
      if(messageDownload) {
        this.onDownloadedFileFromPhone(messageDownload)
      }
      break
    case MessageCommands.UPLOAD:
      this.wsListFiles()
      break
    case MessageCommands.LIST_FILES:
      let messageListFiles = receivedMessage as MessageListFiles
  
      if(messageListFiles) {
        this.parseListFiles(messageListFiles)
      }
      break
    }
  }

  private wsUploadFile(filename: string | undefined, size: number, base64String: string) {
    this.ws?.send(JSON.stringify({
      type: MessageTypes.FORWARD,
      command: MessageCommands.UPLOAD,
      payload: { filepath: filename, path: '', size: size, bytes: base64String },
    }))
  }

  private wsListFiles(func?: () => void) {
    if (func) this.wsOnMessageListenersListFiles = func

    this.ws?.send(
      JSON.stringify({
        type: MessageTypes.FORWARD,
        command: MessageCommands.LIST_FILES,
      })
    )
  }
}
