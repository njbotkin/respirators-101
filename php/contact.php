<?php

	header("Access-Control-Allow-Origin: *");

	// print_r($_SERVER);

	if($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
		http_response_code(200);
		header('Allow: GET');
		header('Access-Control-Allow-Headers: Content-Type');
		die();
	}

	if($_SERVER['REQUEST_METHOD'] != 'POST') {
		http_response_code(500);
		die('nope');
	}

	$data = json_decode(file_get_contents('php://input'), true);
		
	$name = isset($data['name']) ? trim($data['name']) : '';
	$subject = isset($data['subject']) ? trim($data['subject']) : '';
	$email = isset($data['email']) ? trim($data['email']) : '';
	$comment = isset($data['comment']) ? trim($data['comment']) : '';
	
	$headers  = 'From: '. $name . '<' . $email . '>' . "\r\n";
	$headers .= 'Reply-To: ' . $email . "\r\n";
	$headers .= 'MIME-Version: 1.0' . "\r\n";
	$headers .= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";
	
	if(mail('noah.botkin@firstpacificmedia.com', $subject, $comment, $headers)) {
		http_response_code(200);
	} else {
		http_response_code(500);
	}

?>