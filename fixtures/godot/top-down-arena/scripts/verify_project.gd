extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const PLAYER_SCRIPT := "res://scripts/player.gd"
const MAIN_SCRIPT := "res://scripts/main.gd"
const OBJECTIVE_SCRIPT := "res://scripts/objective_marker.gd"
const SUCCESS_MARKER := "FORGE_TOP_DOWN_ARENA_VERIFY_OK"


func _initialize() -> void:
	call_deferred("_verify_project")


func _verify_project() -> void:
	if not _require(ProjectSettings.get_setting("application/run/main_scene") == MAIN_SCENE, "Configured main scene is incorrect"):
		return
	for action in ["ui_left", "ui_right", "ui_up", "ui_down"]:
		if not _require(InputMap.has_action(action), "Required input action is missing: " + action):
			return
	for script_path in [MAIN_SCRIPT, PLAYER_SCRIPT, OBJECTIVE_SCRIPT]:
		if not _require(load(script_path) is Script, "GDScript could not be parsed: " + script_path):
			return

	var packed_scene := load(MAIN_SCENE) as PackedScene
	if not _require(packed_scene != null, "Main scene could not be loaded"):
		return
	var scene := packed_scene.instantiate()
	root.add_child(scene)
	await process_frame

	if not _require(scene.name == "Main", "Required Main node is missing"):
		return
	if not _require(scene.get_node_or_null("ArenaBoundary") is Node2D, "Arena boundary is missing"):
		return
	var player_node := scene.get_node_or_null("Player")
	if not _require(player_node is CharacterBody2D, "Required Player CharacterBody2D is missing"):
		return
	var player := player_node as CharacterBody2D
	if not _require(_script_path(player) == PLAYER_SCRIPT, "Player script is missing or incorrect"):
		return
	if not _require(player.call("forge_verify_velocity", Vector2.RIGHT).x > 0.0, "Movement logic did not execute"):
		return
	if not await _moves_player_right(player, KEY_RIGHT):
		_require(false, "Arrow-key movement did not move the player")
		return
	player.position = Vector2(240.0, 320.0)
	player.velocity = Vector2.ZERO
	if not await _moves_player_right(player, KEY_D):
		_require(false, "WASD movement did not move the player")
		return
	var objective := scene.get_node_or_null("ObjectiveMarker")
	if not _require(objective is Area2D and _script_path(objective) == OBJECTIVE_SCRIPT, "Objective marker is missing or incorrect"):
		return
	if not _require(scene.get_node_or_null("Camera2D") is Camera2D, "Camera-safe framing node is missing"):
		return

	print(SUCCESS_MARKER + " main=pass player=pass input=pass movement=pass objective=pass scripts=pass external=none")
	quit(0)


func _moves_player_right(player: CharacterBody2D, key: Key) -> bool:
	var start_x := player.position.x
	var input_event := InputEventKey.new()
	input_event.keycode = key
	input_event.physical_keycode = key
	input_event.pressed = true
	Input.parse_input_event(input_event)
	for _frame in range(8):
		await physics_frame
	input_event.pressed = false
	Input.parse_input_event(input_event)
	await physics_frame
	return player.position.x > start_x + 1.0


func _script_path(node: Node) -> String:
	var script := node.get_script() as Script
	return script.resource_path if script != null else ""


func _require(condition: bool, message: String) -> bool:
	if condition:
		return true
	push_error("FORGE_TOP_DOWN_ARENA_VERIFY_FAILED: " + message)
	quit(1)
	return false
