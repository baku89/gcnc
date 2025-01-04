<script setup lang="ts">
import {CNCDeviceNodeSerialGrbl} from 'gcnc'

async function connect() {
	const device = await navigator.serial.requestPort()
	console.log(device)
}
</script>

<template>
	<div>
		<button @click="connect">Connect</button>
	</div>
</template>
