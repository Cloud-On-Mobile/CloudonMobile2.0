<script lang="ts" setup>
import { shallowRef, ShallowRef, onMounted } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseUpload from '@/components/ui/BaseUpload.vue'
import FileTable from '@/components/FileTable.vue'
import ImageLogOut from '@/assets/images/buttons/ImageLogOut.svg'
import ImageFiles from '@/assets/images/buttons/ImageFiles.svg'
import ImageLogo from '@/assets/images/buttons/ImageLogo.svg'
import File from '@/types/File'
import { useContext } from '@/composables/context'

const ctx = useContext()
const { webSocketService } = ctx

const files: ShallowRef<File[]> = shallowRef([])
const tableHeaders: ShallowRef = shallowRef([
  { label: 'image', field: '' },
  { label: 'name', field: 'NAME' },
  { label: 'size', field: 'FILE SIZE' },
  { label: 'time', field: 'UPLOAD DATE' },
  { label: 'button', field: '' },
  { label: 'button', field: '' },
])

async function refreshFilesList() {
  await webSocketService.wsListFiles((listFiles: File[]) => {
    files.value = listFiles
  })
}

function onDrop(event: DragEvent) {
  if(event.dataTransfer) {
    const items = event.dataTransfer.items
    let index = items.length - 1

    while(index > -1) {
      if(items[index].kind === 'file') {
        const file: globalThis.File | null = items[index].getAsFile()
        debugger

        if(file) {
          webSocketService.sendFile(file)
        }
      } else {
        alert('This item can not be uploaded.')
      }
      index--
    }
  }
}

onMounted(() => {
  refreshFilesList()
})
</script>

<template>
  <div class="dashboard-files">
    <div class="dashboard-files__left">
      <div>
        <p class="dashboard-files__logo">
          <ImageLogo />Cloud On Mobile
        </p>

        <BaseUpload :max-size="1" />
      </div>

      <div class="dashboard-files__log-out">
        <ImageLogOut />
        <p class="dashboard-files__log-out-text">
          Disconnect
        </p>
      </div>
    </div>

    <h1 class="dashboard-files__title">
      All files
    </h1>

    <div
      v-if="files.length !== 0"
      class="dashboard-files__files dashboard-files__files--full"
      @dragover.prevent
      @dragenter.prevent
      @dragleave.prevent="onDrop"
      @drop.prevent="onDrop"
    >
      <FileTable
        :files="files"
        :table-headers="tableHeaders"
      />
    </div>

    <div
      v-else
      class="dashboard-files__files dashboard-files__files--empty"
      @dragover.prevent
      @dragenter.prevent
      @dragleave.prevent="onDrop"
      @drop.prevent="onDrop"
    >
      <ImageFiles />
      <p>There are no items here!</p>
      <p>Drag & drop your file here to start uploading</p>
      <p>- or -</p>
      <BaseButton theme="active">
        Browse Files
      </BaseButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-files {
  display: grid;
  grid-auto-rows: auto;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(9, 1fr);
  gap: 8px 8px;
  height: 100vh;
  overflow: hidden;

  &__left {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    grid-column-start: 1;
    grid-column-end: 3;
    grid-row-start: 1;
    grid-row-end: 9;
    padding-right: 20px;
  }
  &__log-out {
    grid-row-start: 9;
    grid-row-end: 10;
    font-weight: 400;
    font-size: 16px;
    line-height: 24px;
    color: #0c0c0c;
    display: flex;
    align-content: center;

    &-text {
      margin: 0 11px;
    }
  }
  &__right {
  }
  &__files {
    width: 100%;
    grid-column-start: 3;
    grid-column-end: 11;
    grid-row-start: 2;
    grid-row-end: 9;

    &--full {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      align-content: flex-start;
      flex-wrap: wrap;
    }
    &--empty {
      border: 1px dashed #0e70f1;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      align-content: center;
      flex-wrap: wrap;
    }

    &-content {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
    }
  }
  &__logo {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  &__title {
    grid-column-start: 3;
    grid-column-end: 11;
    grid-row-start: 1;
    grid-row-end: 1;
  }
  &__button {
    width: 100%;
    margin-top: 30px;
  }
}
</style>