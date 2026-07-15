extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const MAIN_SCRIPT := "res://scripts/main.gd"
const RELAY_SCRIPT := "res://scripts/objective_marker.gd"
const SUCCESS_MARKER := "FORGE_RELAY_ACTIVATION_V1_OK"


func _initialize() -> void:
	call_deferred("_verify")


func _verify() -> void:
	var packed_scene := load(MAIN_SCENE) as PackedScene
	if not _require(packed_scene != null, "Main scene could not be loaded"):
		return
	var scene := packed_scene.instantiate()
	root.add_child(scene)
	await process_frame
	if not _require(scene.get_script() != null and (scene.get_script() as Script).resource_path == MAIN_SCRIPT, "Main script changed or is missing"):
		return
	var relay := scene.get_node_or_null("ObjectiveMarker")
	if not _require(relay is Area2D, "ObjectiveMarker must remain one Area2D relay"):
		return
	if not _require(relay.get_script() != null and (relay.get_script() as Script).resource_path == RELAY_SCRIPT, "Relay script changed or is missing"):
		return
	if not _require(str(relay.get_meta("forge_role", "")) == "signal_relay", "Expected forge_role=signal_relay"):
		return
	if not _require(str(relay.get_meta("relay_state", "")) == "inactive", "Relay must begin inactive"):
		return
	if not _require(scene.has_method("activate_signal_relay"), "Main must expose activate_signal_relay"):
		return
	scene.call("activate_signal_relay")
	await process_frame
	if not _require(str(relay.get_meta("relay_state", "")) == "activated", "Relay did not enter the activated state"):
		return
	if not _require((relay as CanvasItem).visible, "Activated relay is not visible"):
		return
	print(SUCCESS_MARKER + " count=1 role=signal_relay before=inactive after=activated scripts=pass visible=pass")
	quit(0)


func _require(condition: bool, message: String) -> bool:
	if condition:
		return true
	push_error("FORGE_RELAY_ACTIVATION_V1_FAILED: " + message)
	quit(1)
	return false
