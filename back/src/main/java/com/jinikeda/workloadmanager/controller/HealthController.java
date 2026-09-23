package com.jinikeda.workloadmanager.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 動作確認用のヘルスチェックエンドポイント。
 * 要件定義・設計が固まり次第、本格的なコントローラー群に置き換えていく。
 */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

}
