extends CharacterBody2D

@export var speed := 250.0
const MINIMUM := Vector2(94.0, 138.0)
const MAXIMUM := Vector2(866.0, 454.0)


func _ready() -> void:
	queue_redraw()


func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	var wasd_direction := Vector2(
		float(Input.is_physical_key_pressed(KEY_D)) - float(Input.is_physical_key_pressed(KEY_A)),
		float(Input.is_physical_key_pressed(KEY_S)) - float(Input.is_physical_key_pressed(KEY_W)),
	)
	if wasd_direction != Vector2.ZERO:
		direction = wasd_direction.normalized()
	velocity = forge_verify_velocity(direction)
	move_and_slide()
	position = position.clamp(MINIMUM, MAXIMUM)


func forge_verify_velocity(direction: Vector2) -> Vector2:
	return direction.normalized() * speed if direction != Vector2.ZERO else Vector2.ZERO


func _draw() -> void:
	draw_circle(Vector2.ZERO, 22.0, Color("142947"))
	draw_circle(Vector2.ZERO, 16.0, Color("38bdf8"))
	draw_circle(Vector2.ZERO, 7.0, Color("d7f5ff"))
	draw_arc(Vector2.ZERO, 27.0, 0.0, TAU, 32, Color("6bdcff"), 2.0)
	draw_line(Vector2(0.0, -30.0), Vector2(0.0, -20.0), Color("b8f0ff"), 3.0)
