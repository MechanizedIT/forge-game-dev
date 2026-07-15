extends SceneTree

const MAIN_SCENE := "res://scenes/main.tscn"
const EXPECTED_SCRIPT := "res://scripts/objective_marker.gd"
const SUCCESS_MARKER := "FORGE_GRAVITY_ORB_PRESENCE_V1_OK"


func _initialize() -> void:
	call_deferred("_verify")


func _verify() -> void:
	var packed_scene := load(MAIN_SCENE) as PackedScene
	if not _require(packed_scene != null, "Main scene could not be loaded"):
		return
	var scene := packed_scene.instantiate()
	root.add_child(scene)
	await process_frame

	var matches: Array[Node] = []
	_collect_orbs(scene, matches)
	if not _require(matches.size() == 1, "Expected exactly one forge_role=gravity_orb node"):
		return
	var orb := matches[0]
	if not _require(orb is Area2D, "Gravity orb must remain an Area2D"):
		return
	if not _require(orb.name == "ObjectiveMarker", "Controlled ObjectiveMarker node name changed"):
		return
	var script := orb.get_script() as Script
	if not _require(script != null and script.resource_path == EXPECTED_SCRIPT, "Gravity orb script is missing or incorrect"):
		return
	if not _require(orb is CanvasItem and (orb as CanvasItem).visible, "Gravity orb is not visible"):
		return

	print(SUCCESS_MARKER + " count=1 role=gravity_orb node=ObjectiveMarker script=pass visible=pass")
	quit(0)


func _collect_orbs(node: Node, matches: Array[Node]) -> void:
	if str(node.get_meta("forge_role", "")) == "gravity_orb":
		matches.append(node)
	for child in node.get_children():
		_collect_orbs(child, matches)


func _require(condition: bool, message: String) -> bool:
	if condition:
		return true
	push_error("FORGE_GRAVITY_ORB_PRESENCE_V1_FAILED: " + message)
	quit(1)
	return false
