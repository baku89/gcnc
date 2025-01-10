<script setup lang="ts">
import {CNCDevice, CNCDeviceWebSerialGrbl, CNCDeviceWebSocketGrbl} from 'gcnc'

const deviceType = ref<'serial' | 'websocket'>('websocket')

const websocketUrl = ref('ws://fluidnc.local:81')

const command = ref('')
const messages = ref<string[]>([])

const cnc = shallowRef<CNCDevice | null>(null)

const status = ref('')

async function toggleConnection() {
	if (cnc.value) {
		await cnc.value.close()
		cnc.value = null
		return
	}

	if (deviceType.value === 'serial') {
		const port = await navigator.serial.requestPort()
		cnc.value = new CNCDeviceWebSerialGrbl(port)
	} else {
		cnc.value = new CNCDeviceWebSocketGrbl(websocketUrl.value, {
			checkStatusInterval: Infinity,
		})
	}

	cnc.value.on('disconnect', () => {
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
	command.value = ''
}
</script>

<template>
	<div>
		<select v-model="deviceType">
			<option value="serial">Serial</option>
			<option value="websocket">WebSocket</option>
		</select>
		<input v-if="deviceType === 'websocket'" v-model="websocketUrl" />
		<button @click="toggleConnection">
			{{ cnc ? 'Disconnect' : 'Connect' }}
		</button>
		<input
			type="text"
			v-model="command"
			:disabled="!cnc"
			@keydown.enter="sendCommand"
		/>
		<button @click="sendCommand" :disabled="!cnc">Send</button>
		<ul class="messages">
			<li v-for="(message, i) in messages" :key="i">{{ message }}</li>
		</ul>
		<div class="status">{{ status }}</div>
	</div>
</template>

<style lang="stylus" scoped>

button, input
	display block
	border 1px solid black

.status, .messages
	font-family monospace
</style>
