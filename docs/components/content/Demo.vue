<script setup lang="ts">
import {CNCDeviceWebSerialGrbl} from 'gcnc'

const command = ref('')
const messages = ref<string[]>([])

const cnc = shallowRef<CNCDeviceWebSerialGrbl | null>(null)

const status = ref('')

async function connect() {
	const device = await navigator.serial.requestPort()

	cnc.value = new CNCDeviceWebSerialGrbl(device)

	cnc.value.on('disconnected', () => {
		cnc.value = null
	})

	cnc.value.on('status', _status => {
		status.value = JSON.stringify(_status)
	})

	cnc.value.on('message', msg => {
		messages.value.push(msg)
	})

	await cnc.value.open()
}

function sendCommand() {
	if (!cnc.value) return
	cnc.value.send(command.value)
}
</script>

<template>
	<div>
		<button @click="connect">Connect</button>
		<input class="input" type="text" v-model="command" />
		<div class="status">{{ status }}</div>
		<button @click="sendCommand">Send</button>
		<ul class="messages">
			<li v-for="(message, i) in messages" :key="i">{{ message }}</li>
		</ul>
	</div>
</template>

<style lang="stylus" scoped>

button, input
	display block

.input
	border 1px solid black
</style>
