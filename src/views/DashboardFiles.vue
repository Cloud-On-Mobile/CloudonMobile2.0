<script lang="ts" setup>
import { shallowRef, onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import ButtonMenu from '@/assets/images/buttons/ButtonMenu.svg'

import BurgerMenu from '@/components/BurgerMenu.vue'
import FileTable from '@/components/FileTable.vue'
import LeftMenu from '@/components/LeftMenu.vue'
import NoFilesSpace from '@/components/NoFilesSpace.vue'
import TheWidget from '@/components/TheWidget.vue'
import SearchBar from '@/components/ui/SearchBar.vue'

import Chips from '@/types/Chips'
import File from '@/types/File'
import Message from '@/types/Message'

import { useContext } from '@/composables/context'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const ctx = useContext()
const { webSocketService, modalService } = ctx

const files = shallowRef<File[]>([])
const tableHeaders = shallowRef([
  { id: 0, label: 'image', field: '', sortable: false },
  { id: 1, label: 'name', field: t('dashboard.fileName'), sortable: true },
  { id: 2, label: 'size', field: t('dashboard.fileSize'), sortable: false },
  { id: 3, label: 'time', field: t('dashboard.fileTime'), sortable: true },
  { id: 4, label: 'button', field: '', sortable: false },
  { id: 5, label: 'button', field: '', sortable: false },
  { id: 6, label: 'button-more', field: '', sortable: false }
])

const ifErrorShowModal = () => {
  modalService.open({
    title: t('dashboard.errorModalTitle'),
    description: t('dashboard.errorModalDescription'),
    buttonAction: {
      text: t('dashboard.close'),
      callback: () => {
        modalService.close()
        router.push('/')
      }
    },
    isCancel: false
  })
}

const isPasscodeCorrect = ref<boolean | null>(null)
const regexPattern = /^\d{6}$/
const isCodeValid = computed(() => regexPattern.test(route.params.passcode as string))

onMounted(() => {
  if(!isCodeValid.value) {
    modalService.open({
      title: t('dashboard.errorPasscodeTitle'),
      description: t('dashboard.errorPasscodeDescription'),
      buttonAction: {
        text: t('dashboard.close'),
        callback: () => {
          modalService.close()
          router.push('/')
        }
      },
      isCancel: false
    })

    return
  }

  if(!webSocketService.isConnectedValue){
    webSocketService.addWsOnMessageListener(function (messageFromServer: Message) {
      if(messageFromServer.result) {
        // Wrong passcode
        isPasscodeCorrect.value = false
      } else if(!messageFromServer.result) {
        // Correct passcode
        isPasscodeCorrect.value = true
        refreshFilesList()
      }
    })
    const passcode = parseInt(route.params.passcode as string)
    webSocketService.login(passcode, ifErrorShowModal)
  } else {
    refreshFilesList()
  }
})

async function refreshFilesList() {
  await webSocketService.wsListFiles((listFiles: File[]) => {
    files.value = listFiles
    filteredFiles.value = files.value
  })
}

const selectedFiles = ref<File[]>([])
const quantityItemsSelected = computed(()=>selectedFiles.value.length)
const quantityFileName = computed(() => quantityItemsSelected.value > 1 ?
  t('dashboard.files') : t('dashboard.file'))
const clearItems = ref(false)

function itemsSelected(itemsSelected: File[]) {
  selectedFiles.value = itemsSelected
}

function downloadFiles() {
  clearItems.value = true
  selectedFiles.value.forEach(file => {
    webSocketService.downloadFile(file.name)
  })
  clearItems.value = false
  closeWidgetClicked.value = true
}

function deleteFiles() {
  modalService.open({
    title: `${t('dashboard.delete')} ${ quantityItemsSelected.value } ${ quantityFileName.value }`,
    description: `${t('dashboard.areYouSureText')} ${ quantityItemsSelected.value } ${ quantityFileName.value } ${t('dashboard.areYouSureTextContinued')}`,
    buttonAction: {
      text: t('dashboard.delete'),
      callback: () => {
        selectedFiles.value.forEach(file => {
          webSocketService.deleteFile(file.name)
        })
        clearItems.value = false
        closeWidgetClicked.value = true
        modalService.close()
      },
    },
  })
}

const closeWidgetClicked = ref(false)

function closeWidget() {
  closeWidgetClicked.value = true
}

watch(quantityItemsSelected, newValue => {
  if(!newValue) closeWidgetClicked.value = false
})
const filteredFiles = shallowRef<File[]>([])
const title = ref<string>(t('dashboard.allFiles'))

const listOfCategoriesSelected = ref<string[]>([])

function getChipsSelected(categories: Chips[]) {
  if(categories !== undefined){
    listOfCategoriesSelected.value = categories
      .filter((chips: Chips) => chips.isClicked === true)
      .map((chips: Chips) => chips.chipsName)
  }
}

function searchByTextAndCategory(searchText: string) {
  title.value = t('dashboard.searchResult')

  if(searchText) {
    if(listOfCategoriesSelected.value.length) {
      const filteredValues = files.value.filter((file: File) =>
        listOfCategoriesSelected.value.some((category: string) => file.type?.includes(category)))
      filteredFiles.value = filteredValues.filter((file: File) =>
        file.name.toLowerCase().includes(searchText.toLowerCase()))
    } else {
      filteredFiles.value = files.value.filter((file: File) =>
        file.name.toLowerCase().includes(searchText.toLowerCase()))
    }
  } else {
    if(listOfCategoriesSelected.value.length) {
      filteredFiles.value = files.value.filter((file: File) =>
        listOfCategoriesSelected.value.some((category: string) => file.type?.includes(category)))
    } else {
      filteredFiles.value = files.value
    }
  }
}

function findFile(searchText: string, categories: Chips[]) {
  getChipsSelected(categories)

  if(!listOfCategoriesSelected.value.length  && !searchText) return  clearSearch()

  searchByTextAndCategory(searchText)
}

function clearSearch() {
  filteredFiles.value = files.value
  title.value = t('dashboard.allFiles')
}

const ASC = 'asc'
const DSC = 'dsc'
const sortDirections = ref<{ [key: string]: string }>({'name': ASC, 'time': ASC })

function sortName() {
  sortDirections.value.name = sortDirections.value.name  === ASC ? DSC : ASC

  filteredFiles.value.sort((a: File, b: File) => {
    const nameA = a.name.toUpperCase()
    const nameB = b.name.toUpperCase()

    if (sortDirections.value.name === ASC) {
      return nameA.localeCompare(nameB )
    } else {
      return nameB.localeCompare(nameA)
    }
  })
}

function sortByEpochDate() {
  sortDirections.value.time = sortDirections.value.time  === ASC ? DSC : ASC
  
  filteredFiles.value.sort((a: File, b: File) => {
    if(!a.date_epoch && !b.date_epoch) return 0
    const dateA = a.date_epoch
    const dateB = b.date_epoch

    if (sortDirections.value.time === ASC) {
      return dateA - dateB
    } else {
      return dateB - dateA
    }
  })
}

function sortTable(headerName: string) {
  if (headerName === 'name') sortName()
  if (headerName === 'time') sortByEpochDate()
}

const isAllFilesBtnActive = ref(true)
const isRecentFilesBtnActive = ref(false)

function sortRecentFiles() {
  isRecentFilesBtnActive.value = true
  isAllFilesBtnActive.value = false
  sortDirections.value.time = DSC
  sortByEpochDate()
  isBurgerMenuOpen.value = false
}

function allFiles() {
  isRecentFilesBtnActive.value = false
  isAllFilesBtnActive.value = true
  refreshFilesList()
  isBurgerMenuOpen.value = false
}

function butonFileUploadClicked() {
  isBurgerMenuOpen.value = false
}

const isBurgerMenuOpen = ref(false)

function onDrop(ev: DragEvent) {
  if(!ev?.dataTransfer?.items) return ifErrorShowModal()
    
  for (const item of ev.dataTransfer.items) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      webSocketService.sendFile(file)
    }else {
      modalService.open({
        title: t('dashboard.uploadModalTitle'),
        description: '',
        buttonAction: {
          text: t('dashboard.close'),
          callback: () => {
            modalService.close()
          }
        },
        isCancel: false
      })
    }
  }
}
</script>

<template>
  <div class="dashboard-files">
    <div class="dashboard-files__left">
      <LeftMenu
        :is-all-files-btn-active="isAllFilesBtnActive"
        :is-recent-files-btn-active="isRecentFilesBtnActive"
        @all-files="allFiles"
        @sort-recent-files="sortRecentFiles"
        @buton-file-upload-clicked="butonFileUploadClicked"
      />
    </div>

    <BurgerMenu
      class="dashboard-files__burger-menu"
      :is-all-files-btn-active="isAllFilesBtnActive"
      :is-recent-files-btn-active="isRecentFilesBtnActive"
      :is-burger-menu-open="isBurgerMenuOpen"
      @all-files="allFiles"
      @sort-recent-files="sortRecentFiles"
      @close-burger-menu="isBurgerMenuOpen = false"
    />
    <div class="dashboard-files__main">
      <div class="dashboard-files__main-search">
        <ButtonMenu
          class="dashboard-files__main-search-menu"
          @click="isBurgerMenuOpen = true"
        />

        <SearchBar
          class="dashboard-files__search-bar"
          @search="findFile"
          @clear-search="clearSearch"
        />
      </div>

      <h1 class="dashboard-files__title">
        {{ title }}
      </h1>

      <div
        v-if="filteredFiles.length"
        class="dashboard-files__files dashboard-files__files--full"
        @dragover.prevent
        @dragenter.prevent
        @dragleave.prevent="onDrop"
        @drop.prevent="onDrop"
      >
        <FileTable
          :files="filteredFiles"
          :table-headers="tableHeaders"
          :clear-items="clearItems"
          :close-widget-clicked="closeWidgetClicked"
          :sort-directions="sortDirections"
          @items-selected="itemsSelected"
          @sort-table="sortTable"
        />

        <TheWidget
          v-if="quantityItemsSelected"
          :quantity-items-selected="quantityItemsSelected"
          @download="downloadFiles"
          @delete="deleteFiles"
          @close-widget="closeWidget"
        />
      </div>

      <div
        v-else-if="!filteredFiles.length && title === t('dashboard.searchResult')"
        class="dashboard-files__files dashboard-files__files--search"
      >
        {{ $t("dashboard.filesNotFound") }}
      </div>

      <NoFilesSpace
        v-else-if="!files.length"
        class="dashboard-files__files"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-files {
  height: 100vh;
  display: grid;
  grid-auto-rows: auto;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(9, 1fr);
  gap: $gap-default $gap-default;
  max-width: 1520px;
  width: 100%;

  &__title {
    margin: $spacing-horizontal-medium 0;
  }

  &__left {
    grid-column-start: 1;
    grid-column-end: 3;
    grid-row-start: 1;
    grid-row-end: 10;
    padding-right: calc(2 * $spacing-horizontal-default);
    margin-bottom: $spacing-horizontal-medium;

    @include devices(tablet) {
      display: none;
    }
  }

  &__burger-menu {
    grid-column-start: 1;
    grid-column-end: 3;
    grid-row-start: 1;
    grid-row-end: 10;
    padding-right: calc(2 * $spacing-horizontal-default);

    @include devices(only-desktop) {
      display: none;
    }
  }

  &__main {
    position: relative;
    padding: $spacing-horizontal-big calc($spacing-horizontal-small / 2) $spacing-horizontal-big $spacing-horizontal-big;
    width: 100%;
    grid-column-start: 3;
    grid-column-end: 11;
    grid-row-start: 1;
    grid-row-end: 9;
    height: 100vh;

    @include devices(tablet) {
      grid-column-start: 1;
    }

    &-search {
      display: flex;
      gap: $gap-small;

      @include devices(only-desktop) {
        gap: calc(2 * $gap-big);
      }

      &-menu {
        margin-top: $spacing-horizontal-small;
        min-height: 40px;
        min-width: 40px;

        @include devices(only-desktop) {
          display: none;
        }
      }
    }
  }

  &__files {
    height: calc(100vh - 215px);
    overflow-y: auto;
    
    &--full {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      align-content: flex-start;
      flex-wrap: wrap;
      overflow: auto;
      height: calc(100vh - 215px);
      overflow-y: auto;
      overflow-x: hidden
    }

    &--search {
      font-weight: $font-weight-thin;
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

  &__button {
    width: 100%;
    margin-top: calc(3 * $spacing-horizontal-default);
  }
}

/* Initially show the scrollbar */
::-webkit-scrollbar {
  width: 8px; /* Width of the scrollbar */
}

/* Style the scrollbar track */
::-webkit-scrollbar-track {
  background: transparent; /* Background color of the track */
}

/* Style the scrollbar thumb */
::-webkit-scrollbar-thumb {
  background: #888888; /* Color of the thumb */
  border-radius: calc($radius-small / 2); /* Rounded corners for the thumb */
}

/* Hide the scrollbar thumb by default */
::-webkit-scrollbar-thumb {
  width: 0;
}

/* Show the scrollbar thumb on hover */
::-webkit-scrollbar-thumb:hover {
  width: 10px; /* Width of the thumb when hovered */
  background: #555; /* Color of the thumb on hover */
}

/* Style the scrollbar thumb when scrollbar is dragged */
::-webkit-scrollbar-thumb:active {
  background: #333; /* Color of the thumb when clicked/dragged */
}
</style>
