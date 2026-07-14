extends CharacterBody2D

@export var speed := 240.0


func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	var wasd_direction := Vector2(
		float(Input.is_physical_key_pressed(KEY_D)) - float(Input.is_physical_key_pressed(KEY_A)),
		float(Input.is_physical_key_pressed(KEY_S)) - float(Input.is_physical_key_pressed(KEY_W)),
	)
	if wasd_direction != Vector2.ZERO:
		direction = wasd_direction.normalized()
	velocity = direction * speed
	move_and_slide()
	position.x = clampf(position.x, 40.0, 920.0)
	position.y = clampf(position.y, 120.0, 400.0)
