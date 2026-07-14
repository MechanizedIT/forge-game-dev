extends SceneTree

const MAIN_SCENE := "res://main.tscn"
const PLAYER_SCRIPT := "res://scripts/player.gd"
const ENEMY_SCRIPT := "res://scripts/enemy.gd"


func _initialize() -> void:
	call_deferred("_verify_fixture")


func _verify_fixture() -> void:
	var packed_scene := load(MAIN_SCENE) as PackedScene
	if not _require(packed_scene != null, "Main scene could not be loaded"):
		return

	var scene := packed_scene.instantiate()
	root.add_child(scene)
	await process_frame

	var player_node := scene.get_node_or_null("Player")
	if not _require(player_node is CharacterBody2D, "Required Player CharacterBody2D is missing"):
		return
	var player := player_node as CharacterBody2D
	if not _require(_script_path(player) == PLAYER_SCRIPT, "Player script is missing or incorrect"):
		return

	var enemy_node := scene.get_node_or_null("Enemy")
	if not _require(enemy_node is CharacterBody2D, "Required Enemy CharacterBody2D is missing"):
		return
	var enemy := enemy_node as CharacterBody2D
	if not _require(_script_path(enemy) == ENEMY_SCRIPT, "Enemy script is missing or incorrect"):
		return
	if not _require(enemy.velocity == Vector2.ZERO, "Baseline enemy must start idle"):
		return
	if not await _moves_player_right(player, KEY_RIGHT):
		_require(false, "Arrow-key movement must move the player right")
		return
	player.position = Vector2(250.0, 360.0)
	player.velocity = Vector2.ZERO
	if not await _moves_player_right(player, KEY_D):
		_require(false, "WASD movement must move the player right")
		return

	print("FORGE_FIXTURE_VERIFY_OK player=Player enemy=Enemy baseline=idle controls=arrows+wasd")
	quit(0)


func _moves_player_right(player: CharacterBody2D, key: Key) -> bool:
	var start_x := player.position.x
	var input_event := InputEventKey.new()
	input_event.keycode = key
	input_event.physical_keycode = key
	input_event.pressed = true
	Input.parse_input_event(input_event)
	for _frame in range(10):
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
	push_error("FORGE_FIXTURE_VERIFY_FAILED: " + message)
	quit(1)
	return false
