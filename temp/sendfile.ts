public sendFile(changeEvent: any): void {

    if (!changeEvent.target.files) {
      return
    }

    const file: File = changeEvent.target.files[0]
    const chunk = 16384
    const index = this.users.findIndex((user: IPayload) => user.clientId === this.selectedDataChannelId)


    const message = {
      sender: this.member,
      body: "Download file",
      filename: file.name,
      filesize: file.size,
      contentType: 'file',
      userType: this.type,
      timestamp: new Date()
    }

    this.messages[index].push(message)
    
    const payload = JSON.stringify(message) 

    this._dataChannels[this.selectedDataChannelId].send(payload)

    this._meetingService.signal('files', {
      meetingId: this._meetingID,
      member: this.member,
      filename: file.name,
      filesize: file.size,
      isUpload: true,
      data: payload,
      userType: this.type
    })
    
    const sliceFile = (offset: any) => {

      const reader = new FileReader()

      reader.onload = () => {
        return (event: any) => {

          this._dataChannels[this.selectedDataChannelId].send(event.target.result)

          if (file.size > (offset + event.target.result.byteLength)) {
            setTimeout(sliceFile, 0, (offset + chunk))
          }

          // set file upload progress here
        }
      }

      const slice = file.slice(offset, (offset + chunk))
      reader.readAsArrayBuffer(slice)
    }
    sliceFile(0)
    // this.fileTransfer = false
  }