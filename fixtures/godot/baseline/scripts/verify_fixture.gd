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

	var player := scene.get_node_or_null("Player")
	if not _require(player is CharacterBody2D, "Required Player CharacterBody2D is missing"):
		return
	if not _require(_script_path(player) == PLAYER_SCRIPT, "Player script is missing or incorrect"):
		return

	var enemy := scene.get_node_or_null("Enemy")
	if not _require(enemy is CharacterBody2D, "Required Enemy CharacterBody2D is missing"):
		return
	if not _require(_script_path(enemy) == ENEMY_SCRIPT, "Enemy script is missing or incorrect"):
		return
	if not _require(enemy.velocity == Vector2.ZERO, "Baseline enemy must start idle"):
		return

	print("FORGE_FIXTURE_VERIFY_OK player=Player enemy=Enemy baseline=idle")
	quit(0)


func _script_path(node: Node) -> String:
	var script := node.get_script() as Script
	return script.resource_path if script != null else ""


func _require(condition: bool, message: String) -> bool:
	if condition:
		return true
	push_error("FORGE_FIXTURE_VERIFY_FAILED: " + message)
	quit(1)
	return false
