extends SceneTree

func _initialize() -> void:
	var scene := load("res://scenes/main.tscn") as PackedScene
	if scene == null:
		push_error("Failed loading main scene")
		quit(1)
		return
	var instance: Node = scene.instantiate()
	if instance == null or instance.name != "Main":
		push_error("Main scene root is invalid")
		quit(1)
		return
	instance.free()
	print("FORGE_OPEN_GODOT_VERIFY_OK main=pass scripts=pass")
	quit(0)
